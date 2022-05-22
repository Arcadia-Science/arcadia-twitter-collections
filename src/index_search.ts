require("dotenv").config();
import { TwitterAPI, COLLECTION_URL_PREFIX } from "./twitter";
import {
  NotionAPI,
  CollectionEntry,
  getRichTextValue,
  getTitleValue,
} from "./notion";

// TODOs:
//   Improve search query build up
//   Test filtered stream behavior vs the alternative

// Fetch the list of collections
// Get or create collections
//   During creation add new rules
// Will not support changing of rules, yet
// Connect to the stream
// For each tweet
//   Get the id and the matching_rules.tag (which is the ID of the collection)
//   Add the tweet to the collection by tweet ID and collection ID
//   Alternatively, build an array of updates and submit 100 updates per collection at a time
//   using https://developer.twitter.com/en/docs/twitter-api/v1/tweets/curate-a-collection/api-reference/post-collections-entries-curate

// Alternative approach:
// Manage collection creation example the same
// timeline_order: tweet_reverse_chron
// For each entry
//   Search Twitter
//   For each tweet, get all quote tweets
//   Flatten the list and and submit updates using the /curate endpoint
// Flatten the list and add to the collection

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
    statuses.forEach(async (tweet: any) => {
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
