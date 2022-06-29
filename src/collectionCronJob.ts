require("dotenv").config();
import {
  COLLECTION_URL_PREFIX,
  FilteredStreamRule,
  groupRulesByTag,
  prepareTweetsForCollectionsCuration,
  searchParametersToQuery,
  Tweet,
  TwitterAPI,
} from "./twitter";
import {
  CollectionEntry,
  NotionAPI,
  getRichTextValue,
  getTitleValue,
} from "./notion";

// Set Twitter and Notion API integrations
const twitter = new TwitterAPI();
const notion = new NotionAPI();

const updateNotionDatabaseEntry = async (
  entry: CollectionEntry,
  collectionId: string
) => {
  // Update the Notion entry
  const collectionUrl =
    COLLECTION_URL_PREFIX + collectionId.replace("custom-", "");
  await notion.updateEntryCollectionId(entry.id, collectionId, collectionUrl);
};

const backfillCollection = async (
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

  const tweetsToAdd: Tweet[] = [];
  const tweets = await twitter.searchTweets(searchParams.split(","));
  tweetsToAdd.push.apply(tweetsToAdd, tweets);

  // For each tweet, get all quote tweets
  for (const tweet of tweets) {
    const quoteTweets = await twitter.quoteTweetsForTweet(tweet.id);
    tweetsToAdd.push.apply(tweetsToAdd, quoteTweets);
  }

  // Add these Tweet IDs to the relevant Twitter collection using the Twitter collection API
  const changes = prepareTweetsForCollectionsCuration(tweetsToAdd);
  for (const chunk of changes) {
    await twitter.curateCollection(collectionId, chunk);
  }
};

const createTwitterStreamRules = async (
  entry: CollectionEntry,
  collectionId: string
) => {
  const collectionSearchParams = getRichTextValue(entry, "Search");
  const ruleValue = searchParametersToQuery(collectionSearchParams.split(","));
  const rule: FilteredStreamRule = {
    value: ruleValue,
    tag: collectionId,
  };
  await twitter.addRulesToStream([rule]);
};

const createTwitterCollection = async (entry: CollectionEntry) => {
  // Make sure all relevant fields are there
  const collectionName = getTitleValue(entry, "Name");
  const collectionDescription = getRichTextValue(entry, "Description");
  const collectionSearchParams = getRichTextValue(entry, "Search");
  if (!collectionName || !collectionDescription || !collectionSearchParams)
    throw new Error("Collection missing name, description or search params.");

  const collection = await twitter.createCollection(
    collectionName,
    collectionDescription
  );
  return collection.timeline_id;
};

export const collectionCronJob = async () => {
  // Fetch the list of collection IDs we need to process
  const entries = await notion.getDatabaseEntries(
    process.env.NOTION_DATABASE_ID
  );

  // Fetch the list of rules for our filtered stream
  const allRules = await twitter.getAllStreamRules();
  const rulesByCollectionId = groupRulesByTag(allRules);

  // For each of those entries:
  for (const entry of entries) {
    // Make sure there's a collection ID
    let collectionId = getRichTextValue(entry, "ID");

    // If the collection ID exists, see if we need to update search rules
    if (collectionId) {
      // If the search param is empty, do nothing
      const collectionSearchParams = getRichTextValue(entry, "Search");
      if (!collectionSearchParams) continue;

      // If collection has more than one rule, something went wrong, do nothing
      const collectionRules = rulesByCollectionId[collectionId];
      if (!collectionRules || collectionRules.length > 1) continue;

      const collectionRule = collectionRules[0];
      const ruleValue = searchParametersToQuery(
        collectionSearchParams.split(",")
      );
      // Rule hasn't changed, do nothing
      if (collectionRule.value === ruleValue) continue;

      // If the rules have changed, create new rules and the delete old one
      await createTwitterStreamRules(entry, collectionId);
      await twitter.deleteRulesFromStream([collectionRule.id]);

      // Trigger a backfill
      await backfillCollection(entry, collectionId);
    } else {
      try {
        // If not create the collection
        const collectionId = await createTwitterCollection(entry);

        // Update Notion
        await updateNotionDatabaseEntry(entry, collectionId);

        // Create Twitter filtered stream rules
        await createTwitterStreamRules(entry, collectionId);

        // Backfill the collection tweets for the last 7 days
        await backfillCollection(entry, collectionId);
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
