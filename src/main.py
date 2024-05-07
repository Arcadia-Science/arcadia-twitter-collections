from dotenv import load_dotenv
import os
import random

from notion import NotionAPI
from twitter import TwitterAPI
from utils import (
    filter_out_retweets,
    get_rich_text_value,
    generate_collection_id,
    is_within_last_two_weeks,
    search_params_to_query,
    update_entry_collection_metadata,
    update_entry_tweets,
)

load_dotenv()  # load environment variables from .env file

ENVIRONMENT = os.getenv("ENVIRONMENT")
COLLECTION_URL_PREFIX = os.getenv("COLLECTION_URL_PREFIX")
NOTION_API_TOKEN = os.getenv("NOTION_API_TOKEN")
NOTION_DATABASE_ID = os.getenv("NOTION_DATABASE_ID")
TWITTER_BEARER_TOKEN = os.getenv("TWITTER_BEARER_TOKEN")


def get_tweets_for_entry(twitter, notion, entry, collection_id):
    if not collection_id:
        return

    search_params = get_rich_text_value(entry, "Search")
    if not search_params:
        return
    search_query = search_params_to_query(search_params.split(","))

    entry_tweets = [
        tweet.strip()
        for tweet in get_rich_text_value(entry, "Tweets").split(",")
        if tweet.strip()
    ]

    last_tweet_id = max(entry_tweets) if entry_tweets else None
    earliest_tweet_id = min(entry_tweets) if entry_tweets else None

    try:
        tweets = twitter.search_tweets(query=search_query, last_tweet_id=last_tweet_id)
    except Exception:
        tweets = twitter.search_tweets(query=search_query, last_tweet_id=None)

    # Extreme jank alert: because Twitter has a very heavy rate-limit on quote tweets
    # we'll introduce some randomness to the process with the hope that we can get most
    # of the quote tweets. This focuses mostly on the first tweet in a given series of
    # tweets because that is the most likely to get quote tweets.
    if earliest_tweet_id:
        try:
            # Only fetch quote tweets 20 percent of the time
            if random.random() < 0.2:
                quote_tweets = twitter.get_quote_tweets_for_tweet(earliest_tweet_id)
                tweets.extend(quote_tweets)
        except Exception as err:
            print(f"Error: {err}")

    # Here, we manually filter out retweets because the Twitter API doesn't allow us to
    # reliably do so. Even if the -retweet flag is set, the API occasionally returns retweets.
    tweets_without_retweets = filter_out_retweets(tweets)

    if tweets_without_retweets:
        all_tweets = list(
            set(entry_tweets + [str(tweet["id"]) for tweet in tweets_without_retweets])
        )
        update_entry_tweets(notion, entry, all_tweets)


def main():
    twitter = TwitterAPI(TWITTER_BEARER_TOKEN, cache=ENVIRONMENT == "local")
    notion = NotionAPI(NOTION_API_TOKEN)

    entries = notion.get_database_entries(NOTION_DATABASE_ID)
    for entry in entries:
        collection_id = get_rich_text_value(entry, "ID")
        if collection_id:  # Make sure there's a collection ID
            if not is_within_last_two_weeks(entry["last_edited_time"]):
                continue
            search_params = get_rich_text_value(entry, "Search")
            if not search_params:
                continue

            get_tweets_for_entry(twitter, notion, entry, collection_id)
        else:  # If not create the collection
            try:
                new_id = generate_collection_id(entry)
                collection_url = COLLECTION_URL_PREFIX + new_id.replace("custom-", "")
                update_entry_collection_metadata(notion, entry, new_id, collection_url)
                get_tweets_for_entry(twitter, notion, entry, new_id)
            except Exception as e:
                print(f"Error creating collection on Notion: {e}")


if __name__ == "__main__":
    main()
