import requests_cache
import tweepy


class TwitterAPI:
    def __init__(self, bearer_token, cache=False):
        self.patient_client = tweepy.Client(
            bearer_token=bearer_token, wait_on_rate_limit=True
        )
        self.impatient_client = tweepy.Client(
            bearer_token=bearer_token, wait_on_rate_limit=False
        )

        if cache:
            cached_session = requests_cache.CachedSession(
                "tweepy_cache", expire_after=600
            )  # Cache expires after 600 seconds
            self.patient_client.session = cached_session
            self.impatient_client.session = cached_session

    def get_tweets(self, tweet_ids):
        return self.patient_client.get_tweets(ids=tweet_ids)

    def search_tweets(self, query, last_tweet_id=None, max_results=100):
        params = {"max_results": max_results}

        if last_tweet_id:
            params["since_id"] = last_tweet_id

        tweets = []
        while True:
            fetched = self.patient_client.search_recent_tweets(query=query, **params)
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
            fetched = self.impatient_client.get_quote_tweets(tweet_id, **params)
            if fetched.data is None:
                break

            tweets.extend(fetched.data)
            params["next_token"] = fetched.meta["next_token"]

            if params["next_token"] is None:
                break

        return tweets
