from dotenv import load_dotenv
import os
import random

from notion import NotionAPI
from twitter import TwitterAPI
from utils import (
    dict_to_rich_text_obj,
    filter_out_retweets,
    get_rich_text_value,
    generate_collection_id,
    is_within_last_two_weeks,
    search_params_to_query,
)

load_dotenv()  # load environment variables from .env file

TWITTER_BEARER_TOKEN = os.getenv("TWITTER_BEARER_TOKEN")
NOTION_API_TOKEN = os.getenv("NOTION_API_TOKEN")
NOTION_DATABASE_ID = os.getenv("NOTION_DATABASE_ID")
COLLECTION_URL_PREFIX = os.getenv("COLLECTION_URL_PREFIX")

twitter = TwitterAPI(TWITTER_BEARER_TOKEN)
notion = NotionAPI(NOTION_API_TOKEN)


def update_entry_tweets(entry, tweets):
    tweets_string = tweets.join(",")
    params = dict_to_rich_text_obj({"Tweets": tweets_string})
    notion.update_page(entry["id"], params)


def update_entry_collection_metadata(entry, collection_id):
    collection_url = COLLECTION_URL_PREFIX + collection_id.replace("custom-", "")
    params = dict_to_rich_text_obj({"ID": collection_id, "URL": collection_url})
    notion.update_page(entry["id"], params)


def get_tweets_for_entry(entry, collection_id):
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
        all_tweets = set(
            entry_tweets + [tweet["id"] for tweet in tweets_without_retweets]
        )
        update_entry_tweets(entry, all_tweets)


def main():
    # print(twitter.get_quote_tweets_for_tweet("1782472760377106836"))
    entries = notion.get_database_entries(NOTION_DATABASE_ID)
    for entry in entries:
        collectionId = get_rich_text_value(entry, "ID")

        if collectionId:  # Make sure there's a collection ID
            if not is_within_last_two_weeks(entry.last_edited_time):
                continue
            search_params = get_rich_text_value(entry, "Search")
            if not search_params:
                continue

            get_tweets_for_entry(entry, collectionId)
        else:  # If not create the collection
            new_id = generate_collection_id(entry)
            update_entry_collection_metadata(entry, new_id)
            get_tweets_for_entry(entry, new_id)


if __name__ == "__main__":
    main()
