require("dotenv").config();
import Twitter from "twitter";

interface Tweet {
  id_str: string;
  text: string;
  full_text: string;
  user: {
    id_str: string;
    name: string;
    screen_name: string;
    followers_count: number;
  };
}

export class TwitterWrapper {
  private client: Twitter;

  constructor() {
    this.client = new Twitter({
      consumer_key: process.env.TWITTER_CONSUMER_KEY,
      consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
      access_token_key: process.env.TWITTER_ACCESS_TOKEN_KEY,
      access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
    });
  }

  async lookup(id: string): Promise<Tweet> {
    return new Promise<Tweet>((resolve, reject) => {
      this.client.get(
        "statuses/show/" + id + "?tweet_mode=extended",
        (err: Error, tweet: Tweet) => (err ? reject(err) : resolve(tweet))
      );
    });
  }
}
