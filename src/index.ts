require("dotenv").config();
import { TwitterAPI, COLLECTION_URL_PREFIX, Tweet } from "./twitter";
import {
  NotionAPI,
  CollectionEntry,
  getRichTextValue,
  getTitleValue,
} from "./notion";
import { sliceIntoChunks } from "./utils";

// Set Twitter and Notion API integrations
const twitter = new TwitterAPI();
const notion = new NotionAPI();

// Collections "curate" endpoint expects changes in chunks of 100 additions/removals
// And as an array of objects in the following format:
//   {"op": "add", "tweet_id": "X"} OR
//   {"op": "remove","tweet_id": "Y"}
const prepareTweetsForCollectionsCuration = (tweets: Tweet[]) => {
  const tweetsToAdditionChanges = tweets.map((tweet) => {
    return {
      op: "add",
      tweet_id: tweet.id,
    };
  });

  return sliceIntoChunks(tweetsToAdditionChanges, 100);
};

const getOrCreateCollection = async (entry: CollectionEntry) => {
  // Make sure there's a collection ID
  const collectionName = getTitleValue(entry, "Name");
  let collectionId = getRichTextValue(entry, "ID");
  if (collectionId) return collectionId;

  // If not create the collection
  try {
    // Make sure all relevant fields are there
    const collectionDescription = getRichTextValue(entry, "Description");
    const collectionSearchParams = getRichTextValue(entry, "Search");
    if (!collectionName || !collectionDescription || !collectionSearchParams)
      throw new Error("Collection missing name, description or search params.");

    const collection = await twitter.createCollection(
      collectionName,
      collectionDescription
    );
    collectionId = collection.timeline_id;
    const collectionUrl =
      COLLECTION_URL_PREFIX + collectionId.replace("custom-", "");

    // Update the Notion entry
    await notion.updateEntryCollectionId(entry.id, collectionId, collectionUrl);
  } catch (err) {
    console.error(err);
    return undefined;
  }
};

export const run = async () => {
  // await twitter.getCollectionEntries("custom-1527479414790946816");
  // return true;
  // Fetch the list of collection IDs we need to process
  const entries = await notion.getDatabaseEntries(
    process.env.NOTION_DATABASE_ID
  );

  // For each of those entries:
  for (const entry of entries) {
    const collectionId = await getOrCreateCollection(entry);
    // If collectionId doesn't exist, exit the loop
    if (!collectionId) return;

    // Query the Twitter search API with the relevant search terms since the last time job was run
    // Fetch the IDs of tweets returned from the Twitter API
    const searchParams = getRichTextValue(entry, "Search");
    // If searchParams are empty, exit the loop
    if (!searchParams) return;

    const tweetsToAdd: Tweet[] = [];
    const tweets = await twitter.searchTweets(searchParams.split(","));
    tweetsToAdd.push.apply(tweetsToAdd, tweets);

    // // For each tweet, get all quote tweets
    // for (const tweet of tweets) {
    //   const quoteTweets = await twitter.quoteTweetsForTweet(tweet.id);
    //   tweetsToAdd.push.apply(tweetsToAdd, quoteTweets);
    // }

    // Add these Tweet IDs to the relevant Twitter collection using the Twitter collection API
    const changes = prepareTweetsForCollectionsCuration(tweetsToAdd);
    for (const chunk of changes) {
      await twitter.curateCollection(collectionId, chunk);
    }
  }

  return true;
};

if (require.main === module) {
  run();
}
