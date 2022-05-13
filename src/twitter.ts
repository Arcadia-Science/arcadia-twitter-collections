require("dotenv").config();
import Twitter from "twitter";

interface Tweet {
  id_str: string;
  text: string;
  full_text: string;
}

interface Collection {
  id_str: string;
  name: string;
  description: string;
}

export class TwitterWrapper {
  private client: Twitter;

  constructor() {
    this.client = new Twitter({
      consumer_key: process.env.TWITTER_CONSUMER_KEY,
      consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
      bearer_token: process.env.TWITTER_BEARER_TOKEN,
    });
  }

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

  async createCollection(
    name: string,
    description: string
  ): Promise<Collection> {
    return new Promise<Collection>((resolve, reject) => {
      this.client.post(
        "collection/create",
        { name: name, description: description },
        (err: Error, collection: Collection) =>
          err ? reject(err) : resolve(collection)
      );
    });
  }

  async getCollection(id: string): Promise<Collection> {
    return new Promise<Collection>((resolve, reject) => {
      this.client.post(
        "collection/show",
        { id: id },
        (err: Error, collection: Collection) =>
          err ? reject(err) : resolve(collection)
      );
    });
  }

  async addTweetToCollection(
    collectionId: string,
    tweetId: string
  ): Promise<Collection> {
    return new Promise<Collection>((resolve, reject) => {
      this.client.post(
        "collection/entries/add",
        { id: collectionId, tweet_id: tweetId },
        (err: Error, collection: Collection) =>
          err ? reject(err) : resolve(collection)
      );
    });
  }
}
