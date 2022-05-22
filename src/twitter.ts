require("dotenv").config();
import TwitterApi from "twitter-api-v2";

const COLLECTION_NAME_CHAR_LIMIT = 25;
const COLLECTION_DESCRIPTION_CHAR_LIMIT = 160;

interface Tweet {
  id_str: string;
  text: string;
  full_text: string;
}

export interface SearchResponse {
  statuses: Tweet[];
  search_metadata: Record<string, string>;
}

export interface Collection {
  response: Record<"timeline_id", string>;
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
  async searchTweets(terms: string | string[]): Promise<any> {
    const query = typeof terms === "string" ? terms : terms.join(" 0R ");
    const tweets = await this.appOnlyClient.v2.search(query);

    while (!tweets.done) {
      await tweets.fetchNext();
    }

    console.log(tweets);
    return tweets;
  }

  // Create a Twitter collection with a specific name and description
  async createCollection(name: string, description: string): Promise<any> {
    // Enforce character limits (25 chars for name, 160 chars for description)
    if (
      name.length > COLLECTION_NAME_CHAR_LIMIT ||
      description.length > COLLECTION_DESCRIPTION_CHAR_LIMIT
    )
      throw new Error(
        "Collection name or description exceeds allowed character limit."
      );

    const response = await this.userClient.v1.post("collection/create", {
      name: name,
      description: description,
    });

    console.log(response);
    return response;
  }

  // Fetch the specific Twitter collection by ID
  async getCollection(id: string): Promise<any> {
    const response = await this.userClient.v1.get("collections/show", {
      id: id,
    });

    console.log(response);
    return response;
  }

  // Add specific tweet to a Twitter collection
  async addTweetToCollection(
    collectionId: string,
    tweetId: string
  ): Promise<any> {
    const response = await this.userClient.v1.post("collections/entries/add", {
      id: collectionId,
      tweet_id: tweetId,
    });

    console.log(response);
    return response;
  }
}
