require("dotenv").config();
import { isValidHttpUrl, sliceIntoChunks } from "./utils";
import {
  StreamingV2Rule,
  TwitterApi,
  TweetV2SingleResult,
} from "twitter-api-v2";
export { ETwitterStreamEvent } from "twitter-api-v2";

const COLLECTION_NAME_CHAR_LIMIT = 25;
const COLLECTION_DESCRIPTION_CHAR_LIMIT = 160;

export interface Tweet {
  id: string;
  text: string;
  referenced_tweets?: any;
}

export interface SearchResponse {
  statuses: Tweet[];
  search_metadata: Record<string, string>;
}

interface Collection {
  timeline_id: string;
}

export interface FilteredStreamRule {
  value: string;
  tag: string;
}

// Helpers
// Given a query string, if it's a valid URL, parse it as a URL for Twitter search
// Otherwise parse it as an exact match string
const parseQueryParams = (text: string) => {
  if (isValidHttpUrl(text)) return `url:"${text}"`;
  if (text.startsWith("#")) return text;
  else return `"${text}"`;
};

// Given a search term or an array of search terms, build a query string
// that excludes retweets
export const searchParametersToQuery = (terms: string | string[]) => {
  const query =
    typeof terms === "string"
      ? parseQueryParams(terms.trim())
      : terms.map((term) => parseQueryParams(term.trim())).join(" OR ");
  return query;
};

// Collections "curate" endpoint expects changes in chunks of 100 additions/removals
// And as an array of objects in the following format:
//   {"op": "add", "tweet_id": "X"} OR
//   {"op": "remove","tweet_id": "Y"}
export const prepareTweetsForCollectionsCuration = (tweets: Tweet[]) => {
  const tweetsToAdditionChanges = tweets.map((tweet) => {
    return {
      op: "add",
      tweet_id: tweet.id,
    };
  });

  return sliceIntoChunks(tweetsToAdditionChanges, 100);
};

// Rules have the following format:
//  [{"id": "1212121212", "value": "search" ,"tag": "custom-1515151515"}]
// This function groups them by tag and returns an object of tag to array of rules
// Example output:
//  {"custom-1515151515" [{"id": "1212121212", "value": "search" ,"tag": "custom-1515151515"}]}
export const groupRulesByTag = (
  rules: StreamingV2Rule[]
): Record<string, StreamingV2Rule[]> => {
  return rules.reduce(function (
    rv: Record<string, StreamingV2Rule[]>,
    x: StreamingV2Rule
  ) {
    (rv[x.tag] = rv[x.tag] || []).push(x);
    return rv;
  },
  {});
};

// Interacting with the Twitter API
export class TwitterAPI {
  // Used for Collections API endpoints in v1.1
  private userClient: TwitterApi;
  // Used for Search and FilteredStream API endpoints in v2
  private appOnlyClient: TwitterApi;

  constructor() {
    this.userClient = new TwitterApi({
      appKey: process.env.TWITTER_CONSUMER_KEY,
      appSecret: process.env.TWITTER_CONSUMER_SECRET,
      accessToken: process.env.TWITTER_ACCESS_TOKEN_KEY,
      accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
    });

    this.appOnlyClient = new TwitterApi(process.env.TWITTER_BEARER_TOKEN);
  }

  // Tweet search endpoints

  // Search tweets based on terms
  async searchTweets(
    terms: string | string[],
    lastTweetId: string
  ): Promise<Tweet[]> {
    let params: Object = {
      max_results: 100,
      "tweet.fields": ["referenced_tweets"],
    };

    if (lastTweetId) {
      params = {
        ...params,
        since_id: lastTweetId,
      };
    }

    const query = searchParametersToQuery(terms);
    const searchResponse = await this.userClient.v2.search(query, params);

    while (!searchResponse.done) {
      await searchResponse.fetchNext(100);
    }

    return searchResponse.tweets;
  }

  // Get quote tweets of a tweet with ID
  async quoteTweetsForTweet(id: string): Promise<Tweet[]> {
    const quoteTweetsResponse = await this.userClient.v2.quotes(id, {
      max_results: 100,
    });

    while (!quoteTweetsResponse.done) {
      await quoteTweetsResponse.fetchNext(100);
    }

    return quoteTweetsResponse.tweets;
  }

  // Get the tweet with a given ID (used for debugging)
  async getTweet(id: string): Promise<TweetV2SingleResult> {
    const params: Object = {
      "tweet.fields": ["referenced_tweets"],
    };
    return await this.userClient.v2.singleTweet(id, params);
  }

  // Get all the tweets with a given array of IDs (used for debugging)
  async getTweets(ids: string[]) {
    const params: Object = {
      "tweet.fields": ["referenced_tweets"],
    };
    return await this.userClient.v2.tweets(ids, params);
  }

  // FilteredStream endpoints

  // Open a connection to a FilteredStream but do not connect yet
  getStream() {
    return this.appOnlyClient.v2.searchStream({
      autoConnect: false,
    });
  }

  // Get all applied rules to the FilteredStream
  async getAllStreamRules() {
    const responseObject = await this.appOnlyClient.v2.streamRules();
    return responseObject.data || [];
  }

  // Add a set of rules to a Twitter FilteredStream
  async addRulesToStream(rules: FilteredStreamRule[]) {
    await this.appOnlyClient.v2.updateStreamRules({
      add: rules,
    });
  }

  // Delete a set (specified as an array of IDs) of rules from a Twitter FilteredStream
  async deleteRulesFromStream(rules: string[]) {
    await this.appOnlyClient.v2.updateStreamRules({
      delete: {
        ids: rules,
      },
    });
  }

  // Collection API endpoints

  // Create a Twitter collection with a specific name and description
  async createCollection(
    name: string,
    description: string
  ): Promise<Collection> {
    // Enforce character limits (25 chars for name, 160 chars for description)
    if (
      name.length > COLLECTION_NAME_CHAR_LIMIT ||
      description.length > COLLECTION_DESCRIPTION_CHAR_LIMIT
    )
      throw new Error(
        "Collection name or description exceeds allowed character limit."
      );

    const responseObject = await this.userClient.v1.post(
      "collections/create.json",
      {
        name: name,
        description: description,
        timeline_order: "tweet_reverse_chron",
      }
    );

    return responseObject.response;
  }

  async getCollection(collectionId: string) {
    return await this.userClient.v1.get("collections/entries.json", {
      id: collectionId,
    });
  }

  // Update the name and description for a given collection
  async updateCollection(
    collectionId: string,
    name: string,
    description: string
  ) {
    return await this.userClient.v1.post("collections/update.json", {
      id: collectionId,
      name,
      description,
    });
  }

  // Add specific tweet to a Twitter collection
  async addTweetToCollection(collectionId: string, tweetId: string) {
    await this.userClient.v1.post("collections/entries/add.json", {
      id: collectionId,
      tweet_id: tweetId,
    });
  }

  // Add a chunk of tweets to a Twitter collection
  async curateCollection(collectionId: string, changes: Object[]) {
    await this.userClient.v1.post("collections/entries/curate.json", {
      id: collectionId,
      changes: changes,
    });
  }
}
