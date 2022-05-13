require("dotenv").config();
import { TwitterAPI, COLLECTION_URL_PREFIX } from "./twitter";
import {
  NotionAPI,
  CollectionEntry,
  getRichTextProperty,
  isCollectionIdEmpty,
} from "./notion";

// Set Twitter and Notion API integrations
const twitter = new TwitterAPI();
const notion = new NotionAPI();

const createCollectionFromEntry = async (entry: CollectionEntry) => {
  const collectionName = getRichTextProperty(entry, "Name")
    .plain_text as string;
  const collectionDescription = getRichTextProperty(entry, "Description")
    .plain_text as string;

  return await twitter.createCollection(collectionName, collectionDescription);
};

export const run = async () => {
  // Fetch the list of collection IDs we need to process
  const entries = await notion.getDatabaseEntries(
    process.env.NOTION_DATABASE_ID
  );

  // For each of those entries:
  entries.forEach(async (entry) => {
    let collectionId;
    // Make sure there's a "Collection ID"
    if (isCollectionIdEmpty(entry)) {
      // If not create the collection
      collectionId = await createCollectionFromEntry(entry);
      const collectionUrl =
        COLLECTION_URL_PREFIX + collectionId.replace("custom-", "");
      // Update the Notion entry
      await notion.updateEntryCollectionId(
        entry.id,
        collectionId,
        collectionUrl
      );
    } else {
      collectionId = getRichTextProperty(entry, "ID").plain_text as string;
    }

    // // Query the Twitter search API with the relevant search terms since the last time job was run
    // // Fetch the IDs of tweets returned from the Twitter API
    // const searchParams = (getRichTextProperty(entry, "Parameters")
    //   .plain_text as string).split(",");
    // const tweets = twitter.searchTweets(searchParams);
    // console.log(tweets);
    // Add these Tweet IDs to the relevant Twitter collection using the Twitter collection API
  });

  return true;
};

if (require.main === module) {
  run();
}
