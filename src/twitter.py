import tweepy


class TwitterAPI:
    def __init__(self, bearer_token):
        self.client = tweepy.Client(bearer_token=bearer_token)

    def search_tweets(self, query, last_tweet_id=None, max_results=100):
        params = {"max_results": max_results, "tweet.fields": ["referenced_tweets"]}

        if last_tweet_id:
            params["since_id"] = last_tweet_id

        tweets = []
        while True:
            fetched = self.client.search_recent_tweets(query=query, **params)
            if fetched.data is None:
                break

            tweets.extend(fetched.data)
            params["next_token"] = fetched.meta["next_token"]

            if params["next_token"] is None:
                break

        return tweets

    def get_quote_tweets_for_tweet(self, tweet_id, max_results=100):
        params = {"max_results": max_results, "exclude": "retweets"}

        tweets = []
        while True:
            fetched = self.client.get_quote_tweets(tweet_id, **params)
            if fetched.data is None:
                break

            tweets.extend(fetched.data)
            params["next_token"] = fetched.meta["next_token"]

            if params["next_token"] is None:
                break

        return tweets
