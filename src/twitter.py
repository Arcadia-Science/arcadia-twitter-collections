import requests_cache
import tweepy


class TwitterAPI:
    def __init__(self, bearer_token, cache=False):
        self.client = tweepy.Client(bearer_token=bearer_token, wait_on_rate_limit=True)

        if cache:
            cached_session = requests_cache.CachedSession(
                "tweepy_cache", expire_after=600
            )  # Cache expires after 600 seconds
            self.client.session = cached_session

    def get_tweets(self, tweet_ids):
        return self.client.get_tweets(ids=tweet_ids)

    def search_tweets(self, query, last_tweet_id=None, max_results=100):
        params = {"max_results": max_results}

        if last_tweet_id:
            params["since_id"] = last_tweet_id

        tweets = []
        while True:
            fetched = self.client.search_recent_tweets(query=query, **params)
            if fetched.data is None:
                break

            tweets.extend(fetched.data)
            params["next_token"] = fetched.meta.get("next_token", None)

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
            params["pagination_token"] = fetched.meta.get("next_token", None)

            if params["pagination_token"] is None:
                break

        return tweets
