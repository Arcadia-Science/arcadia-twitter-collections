require("dotenv").config();
import {
  CollectionEntry,
  NotionAPI,
  getRichTextValue,
  getTitleValue,
} from "./notion";
import { Tweet, TwitterAPI } from "./twitter";
import { isWithinLastTwoWeeks } from "./utils";

const ID_LENGTH = 19;

// Set Twitter and Notion API integrations
const twitter = new TwitterAPI();
const notion = new NotionAPI();

const updateNotionDatabaseEntry = async (
  entry: CollectionEntry,
  collectionId: string
) => {
  // Update the Notion entry
  const collectionUrl =
    process.env.COLLECTION_URL_PREFIX + collectionId.replace("custom-", "");
  await notion.updateEntryCollectionId(entry.id, collectionId, collectionUrl);
};

const fetchTweetsForEntry = async (
  entry: CollectionEntry,
  collectionId: string
) => {
  // If collectionId doesn't exist, exit the loop
  if (!collectionId) return;

  // Query the Twitter search API with the relevant search terms since the last time job was run
  // Fetch the IDs of tweets returned from the Twitter API
  const searchParams = getRichTextValue(entry, "Search");
  // If searchParams are empty, exit the loop
  if (!searchParams) return;

  const fetchedTweets = getRichTextValue(entry, "Tweets")
    .split(",")
    .map((item: string) => item.trim())
    .filter(Boolean);

  const lastTweet = fetchedTweets.reduce(
    (prev, curr) => (curr > prev ? curr : prev),
    ""
  );

  let tweets: Tweet[] = [];
  try {
    tweets = await twitter.searchTweets(searchParams.split(","), lastTweet);
  } catch (_) {
    tweets = await twitter.searchTweets(searchParams.split(","), "");
  }

  if (tweets.length > 0) {
    const allTweets = [
      ...new Set([...fetchedTweets, ...tweets.map((tweet) => tweet.id)]),
    ];

    await notion.updateEntryTweets(entry.id, allTweets);
  }

  // // For each tweet, get all quote tweets
  // for (const tweet of tweets) {
  //   const quoteTweets = await twitter.quoteTweetsForTweet(tweet.id);
  //   tweetsToAdd.push.apply(tweetsToAdd, quoteTweets);
  // }
};

const generateCollectionId = async (entry: CollectionEntry) => {
  // Make sure all relevant fields are there
  const collectionName = getTitleValue(entry, "Name");
  const collectionDescription = getRichTextValue(entry, "Description");
  const collectionSearchParams = getRichTextValue(entry, "Search");
  if (!collectionName || !collectionDescription || !collectionSearchParams)
    throw new Error("Collection missing name, description or search params.");

  // Make IDs look like Twitter IDs, this should be reasonably unique for our use-case
  return (
    "custom-" +
    Math.ceil(Math.random() * Date.now())
      .toPrecision(ID_LENGTH)
      .toString()
      .replace(".", "")
  );
};

export const collectionCronJob = async () => {
  // Fetch the list of collection IDs we need to process
  const entries = await notion.getDatabaseEntries(
    process.env.NOTION_DATABASE_ID
  );

  // For each of those entries:
  for (const entry of entries) {
    // Make sure there's a collection ID
    let collectionId = getRichTextValue(entry, "ID");

    // If the collection ID exists, get tweets
    if (collectionId) {
      if (isWithinLastTwoWeeks(entry.last_edited_time)) {
        // If the search param is empty, do nothing
        const collectionSearchParams = getRichTextValue(entry, "Search");
        if (!collectionSearchParams) continue;

        // Trigger a backfill
        await fetchTweetsForEntry(entry, collectionId);
      }
    } else {
      try {
        // If not create the collection
        const newCollectionId = await generateCollectionId(entry);

        // Update Notion
        await updateNotionDatabaseEntry(entry, newCollectionId);

        // Backfill the collection tweets for the last 7 days
        await fetchTweetsForEntry(entry, newCollectionId);
      } catch (err) {
        console.error(err);
      }
    }
  }

  return true;
};

if (require.main === module) {
  collectionCronJob();
}
