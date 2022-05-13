require("dotenv").config();
import { TwitterAPI, COLLECTION_URL_PREFIX } from "./twitter";
import {
  NotionAPI,
  CollectionEntry,
  getRichTextValue,
  getTitleValue,
  isCollectionIdEmpty,
} from "./notion";

// Set Twitter and Notion API integrations
const twitter = new TwitterAPI();
const notion = new NotionAPI();

const getOrCreateCollection = async (entry: CollectionEntry) => {
  let collectionId;
  // Make sure there's an "ID"
  if (isCollectionIdEmpty(entry)) {
    // If not create the collection
    // TODO: Make sure all relevant fields are there
    const collectionName = getTitleValue(entry, "Name");
    const collectionDescription = getRichTextValue(entry, "Description");
    collectionId = await twitter.createCollection(
      collectionName,
      collectionDescription
    );
    const collectionUrl =
      COLLECTION_URL_PREFIX + collectionId.replace("custom-", "");
    // Update the Notion entry
    await notion.updateEntryCollectionId(entry.id, collectionId, collectionUrl);
  } else {
    collectionId = getRichTextValue(entry, "ID");
  }
  return collectionId;
};

export const run = async () => {
  // Fetch the list of collection IDs we need to process
  const entries = await notion.getDatabaseEntries(
    process.env.NOTION_DATABASE_ID
  );

  // For each of those entries:
  entries.forEach(async (entry) => {
    const collectionId = await getOrCreateCollection(entry);

    // // Query the Twitter search API with the relevant search terms since the last time job was run
    // // Fetch the IDs of tweets returned from the Twitter API
    const searchParams = getRichTextValue(entry, "Search").split(",");
    // TODO: handle tweet pagination
    const { statuses } = await twitter.searchTweets(searchParams);
    // Add these Tweet IDs to the relevant Twitter collection using the Twitter collection API
    statuses.forEach(async (tweet) => {
      await twitter.addTweetToCollection(collectionId, tweet.id_str);
    });
  });

  return true;
};

if (require.main === module) {
  run();
}
