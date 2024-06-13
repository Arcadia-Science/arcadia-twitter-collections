from dotenv import load_dotenv
import os
import random

from notion import NotionAPI
from twitter import TwitterAPI
from utils import (
    calculate_priority,
    filter_out_retweets,
    get_rich_text_value,
    is_within_last_two_weeks,
    search_params_to_query,
    update_entry_tweets,
)

load_dotenv()  # load environment variables from .env file

ENVIRONMENT = os.getenv("ENVIRONMENT")
NOTION_API_TOKEN = os.getenv("NOTION_API_TOKEN")
NOTION_DATABASE_ID = os.getenv("NOTION_DATABASE_ID")
TWITTER_BEARER_TOKEN = os.getenv("TWITTER_BEARER_TOKEN")


def get_quote_tweets(twitter, notion, collection_id):
    if not collection_id:
        return

    # Re-fetch the entry to make sure it's up-to-date
    entries = notion.get_database_entries(NOTION_DATABASE_ID)
    entry = next(
        (
            entry
            for entry in entries
            if get_rich_text_value(entry, "ID") == collection_id
        ),
        None,
    )

    if entry is None:
        return

    entry_tweets = [
        tweet.strip()
        for tweet in get_rich_text_value(entry, "Tweets").split(",")
        if tweet.strip()
    ]

    tweets = []
    for tweet_id in entry_tweets:
        quote_tweets = twitter.get_quote_tweets_for_tweet(tweet_id)
        tweets.extend(quote_tweets)

    # Here, we manually filter out retweets because the Twitter API doesn't allow us to
    # reliably do so. Even if the -retweet flag is set, the API occasionally returns retweets.
    tweets_without_retweets = filter_out_retweets(tweets)

    if tweets_without_retweets:
        all_tweets = list(
            set(entry_tweets + [str(tweet["id"]) for tweet in tweets_without_retweets])
        )

        if sorted(entry_tweets) != sorted(all_tweets):
            update_entry_tweets(notion, entry, all_tweets)


def main():
    twitter = TwitterAPI(TWITTER_BEARER_TOKEN, cache=ENVIRONMENT == "local")
    notion = NotionAPI(NOTION_API_TOKEN)

    entries = notion.get_database_entries(NOTION_DATABASE_ID)
    entries_with_priority = [
        (entry, calculate_priority(entry["created_time"])) for entry in entries
    ]
    entries_with_priority.sort(key=lambda x: x[1], reverse=True)
    for entry, priority in entries_with_priority:
        collection_id = get_rich_text_value(entry, "ID")
        if collection_id:
            # Priority represents recency in a decaying fashion. Something that is just created has
            # a priority of 1. Something that has been created 2 years ago, will have a priority of
            # close to 0. The priority dictates the frequency of fetching tweets. So, something that
            # is just created will have a higher chance of fetching tweets than something that is
            # 2 years old.
            if random.random() > priority:
                continue
            get_quote_tweets(twitter, notion, collection_id)


if __name__ == "__main__":
    main()
