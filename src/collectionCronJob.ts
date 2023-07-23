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

  const earliestTweet = fetchedTweets.reduce(
    (prev, curr) => (curr < prev ? curr : prev),
    fetchedTweets[0]
  );

  let tweets: Tweet[] = [];
  try {
    tweets = await twitter.searchTweets(searchParams.split(","), lastTweet);
  } catch (_) {
    tweets = await twitter.searchTweets(searchParams.split(","), "");
  }

  // Extreme jank alert: because Twitter has a very heavy rate-limit on quote tweets
  // we'll introduce some randomness to the process with the hope that we can get most
  // of the quote tweets. This focuses mostly on the first tweet in a given series of
  // tweets because that is the most likely to get quote tweets.
  if (earliestTweet) {
    try {
      // Only fetch quote tweets 20 percent of the time
      if (Math.random() < 0.2) {
        const quoteTweets = await twitter.quoteTweetsForTweet(earliestTweet);
        tweets.push.apply(tweets, quoteTweets);
      }
    } catch (err) {
      console.error(err);
    }
  }

  if (tweets.length > 0) {
    const allTweets = [
      ...new Set([...fetchedTweets, ...tweets.map((tweet) => tweet.id)]),
    ];
    await notion.updateEntryTweets(entry.id, allTweets);
  }
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
      if (!isWithinLastTwoWeeks(entry.last_edited_time)) continue;
      // If the search param is empty, do nothing
      const collectionSearchParams = getRichTextValue(entry, "Search");
      if (!collectionSearchParams) continue;

      // Trigger a backfill
      await fetchTweetsForEntry(entry, collectionId);
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
