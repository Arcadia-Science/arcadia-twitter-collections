require("dotenv").config();
import { TwitterAPI, COLLECTION_URL_PREFIX } from "./twitter";
import {
  NotionAPI,
  CollectionEntry,
  getRichTextValue,
  getTitleValue,
} from "./notion";

// Set Twitter and Notion API integrations
const twitter = new TwitterAPI();
const notion = new NotionAPI();

const getOrCreateCollection = async (entry: CollectionEntry) => {
  let collectionId = getRichTextValue(entry, "ID");
  // Make sure there's a collection ID, if not create the collection
  if (!collectionId) {
    try {
      // Make sure all relevant fields are there
      const collectionName = getTitleValue(entry, "Name")?.trim();
      const collectionDescription = getRichTextValue(
        entry,
        "Description"
      )?.trim();
      const collectionSearchParams = getRichTextValue(entry, "Search")?.trim();
      if (!collectionName || !collectionDescription || !collectionSearchParams)
        throw new Error(
          "Collection missing name, description or search params."
        );

      collectionId = await twitter.createCollection(
        collectionName,
        collectionDescription
      );
      const collectionUrl =
        COLLECTION_URL_PREFIX + collectionId.replace("custom-", "");

      // Update the Notion entry
      await notion.updateEntryCollectionId(
        entry.id,
        collectionId,
        collectionUrl
      );
    } catch (err) {
      console.error(err);
      return undefined;
    }
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
    // If collectionId doesn't exist, exit the loop
    if (!collectionId) return;

    // Query the Twitter search API with the relevant search terms since the last time job was run
    // Fetch the IDs of tweets returned from the Twitter API
    const searchParams = getRichTextValue(entry, "Search")?.trim();
    // If searchParams are empty, exit the loop
    if (!searchParams) return;

    // TODO: handle tweet pagination
    const { statuses } = await twitter.searchTweets(searchParams.split(","));
    // Add these Tweet IDs to the relevant Twitter collection using the Twitter collection API
    // Potentially we can gather all the promises returned from addTweetToCollection()
    // and do await Promise.all(), but don't want to hit API rate limits
    statuses.forEach(async (tweet) => {
      try {
        await twitter.addTweetToCollection(collectionId, tweet.id_str);
      } catch (err) {
        console.error(err);
      }
    });
  });

  return true;
};

if (require.main === module) {
  run();
}
