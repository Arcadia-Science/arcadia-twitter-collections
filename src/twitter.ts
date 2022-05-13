require("dotenv").config();
import Twitter from "twitter";

interface Tweet {
  id_str: string;
  text: string;
  full_text: string;
}

interface Collection {
  response: Record<"timeline_id", string>;
}

export const COLLECTION_URL_PREFIX =
  "https://twitter.com/ArcadiaScience/timelines/";

// Interacting with the Twitter API
export class TwitterAPI {
  private client: Twitter;

  constructor() {
    this.client = new Twitter({
      consumer_key: process.env.TWITTER_CONSUMER_KEY,
      consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
      access_token_key: process.env.TWITTER_ACCESS_TOKEN_KEY,
      access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
    });
  }

  // Search tweets based on terms
  async searchTweets(terms: string | string[]): Promise<Tweet> {
    const query = typeof terms === "string" ? terms : terms.join(" 0R ");
    return new Promise<Tweet>((resolve, reject) => {
      this.client.get(
        "search/tweets",
        { q: query },
        (err: Error, tweet: Tweet) => (err ? reject(err) : resolve(tweet))
      );
    });
  }

  // Create a Twitter collection with a specific name and description
  // TODO: Enforce character limits
  async createCollection(name: string, description: string): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      this.client.post(
        "collections/create",
        { name: name, description: description },
        (err: Error, collection: Collection) =>
          err ? reject(err) : resolve(collection.response.timeline_id)
      );
    });
  }

  // Fetch the specific Twitter collection by ID
  async getCollection(id: string): Promise<Collection> {
    return new Promise<Collection>((resolve, reject) => {
      this.client.post(
        "collections/show",
        { id: id },
        (err: Error, collection: Collection) =>
          err ? reject(err) : resolve(collection)
      );
    });
  }

  // Add specific tweet to a Twitter collection
  async addTweetToCollection(
    collectionId: string,
    tweetId: string
  ): Promise<Collection> {
    return new Promise<Collection>((resolve, reject) => {
      this.client.post(
        "collections/entries/add",
        { id: collectionId, tweet_id: tweetId },
        (err: Error, collection: Collection) =>
          err ? reject(err) : resolve(collection)
      );
    });
  }
}
