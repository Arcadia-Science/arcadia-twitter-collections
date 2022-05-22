require("dotenv").config();
import TwitterApi from "twitter-api-v2";

const COLLECTION_NAME_CHAR_LIMIT = 25;
const COLLECTION_DESCRIPTION_CHAR_LIMIT = 160;

export interface Tweet {
  id: string;
  text: string;
}

export interface SearchResponse {
  statuses: Tweet[];
  search_metadata: Record<string, string>;
}

interface Collection {
  timeline_id: string;
}

export const COLLECTION_URL_PREFIX =
  "https://twitter.com/ArcadiaScience/timelines/";

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

  // Search tweets based on terms
  async searchTweets(terms: string | string[]): Promise<Tweet[]> {
    // TODO: Potentially add URL as a param, but probably not needed
    const query = typeof terms === "string" ? terms : terms.join(" 0R ");
    const queryWithoutRetweets = query.concat(" -is:retweet");
    const searchResponse = await this.appOnlyClient.v2.search(
      queryWithoutRetweets,
      {
        max_results: 100,
      }
    );

    while (!searchResponse.done) {
      await searchResponse.fetchNext();
    }

    return searchResponse.tweets;
  }

  // Get quote tweets of a tweet with ID
  async quoteTweetsForTweet(id: string): Promise<Tweet[]> {
    const quoteTweetsResponse = await this.appOnlyClient.v2.quotes(id, {
      max_results: 100,
    });

    while (!quoteTweetsResponse.done) {
      await quoteTweetsResponse.fetchNext();
    }

    return quoteTweetsResponse.tweets;
  }

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
