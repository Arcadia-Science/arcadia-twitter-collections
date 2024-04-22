require("dotenv").config();
import { isValidHttpUrl } from "./utils";
import { TwitterApi } from "twitter-api-v2";
export { ETwitterStreamEvent } from "twitter-api-v2";

export interface Tweet {
  id: string;
  text: string;
  referenced_tweets?: {
    type: string;
    id: string;
  }[];
}

export interface SearchResponse {
  statuses: Tweet[];
  search_metadata: Record<string, string>;
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

// Interacting with the Twitter API
export class TwitterAPI {
  // Used for Collections API endpoints in v1.1
  private userClient: TwitterApi;
  // Used for Search and FilteredStream API endpoints in v2

  constructor() {
    this.userClient = new TwitterApi({
      appKey: process.env.TWITTER_CONSUMER_KEY,
      appSecret: process.env.TWITTER_CONSUMER_SECRET,
      accessToken: process.env.TWITTER_ACCESS_TOKEN_KEY,
      accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
    });
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
  async quoteTweetsForTweet(id: string): Promise<TweetV2[]> {
    const quoteTweetsResponse = await this.userClient.v2.quotes(id, {
      max_results: 100,
    });

    while (!quoteTweetsResponse.done) {
      await quoteTweetsResponse.fetchNext(100);
    }

    return quoteTweetsResponse.tweets;
  }
}
