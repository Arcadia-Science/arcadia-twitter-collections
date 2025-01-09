from dotenv import load_dotenv
import os
import random

from airtable import AirtableAPI
from twitter import TwitterAPI
from utils import (
    calculate_priority,
    get_entry,
    get_entry_tweets,
    get_field_value,
    update_entry_tweets,
)

load_dotenv()

ENVIRONMENT = os.getenv("ENVIRONMENT")
AIRTABLE_API_KEY = os.getenv("AIRTABLE_API_KEY")
AIRTABLE_BASE_ID = os.getenv("AIRTABLE_BASE_ID")
AIRTABLE_TABLE_NAME = os.getenv("AIRTABLE_TABLE_NAME")
TWITTER_BEARER_TOKEN = os.getenv("TWITTER_BEARER_TOKEN")


def get_quote_tweets(twitter, airtable, collection_id):
    """
    Fetch quote tweets for all tweets in a collection.

    Args:
        twitter: TwitterAPI instance
        airtable: AirtableAPI instance
        collection_id: ID of the collection to fetch quote tweets for
    """
    if not collection_id:
        return

    # Re-fetch the entry to make sure it's up-to-date
    entry = get_entry(airtable, collection_id)

    if entry is None:
        return

    og_tweets = get_entry_tweets(entry)
    new_tweets = []

    for tweet_id in og_tweets:
        try:
            quote_tweets = twitter.get_quote_tweets_for_tweet(tweet_id)
            if quote_tweets:
                new_tweets.extend(quote_tweets)
                print(f"Found {len(quote_tweets)} quote tweets for tweet {tweet_id}")
        except Exception as e:
            print(f"Error fetching quote tweets for {tweet_id}: {e}")
            continue

    if new_tweets:
        update_entry_tweets(airtable, entry, og_tweets, new_tweets)


def main():
    # Initialize API clients
    twitter = TwitterAPI(TWITTER_BEARER_TOKEN, cache=ENVIRONMENT == "local")
    airtable = AirtableAPI(
        api_key=AIRTABLE_API_KEY,
        base_id=AIRTABLE_BASE_ID,
        table_name=AIRTABLE_TABLE_NAME
    )

    # Get all entries and calculate their priorities
    entries = airtable.get_database_entries()
    entries_with_priority = [
        (entry, calculate_priority(get_field_value(entry, "Created date"))) for entry in entries
    ]
    entries_with_priority.sort(key=lambda x: x[1], reverse=True)

    # Process entries based on priority
    for entry, priority in entries_with_priority:
        collection_id = get_field_value(entry, "ID")
        if collection_id:
            # Skip based on priority (newer entries have higher chance of being processed)
            if random.random() > priority:
                continue

            print(f"Fetching quote tweets for: {get_field_value(entry, "Description")} (priority: {priority:.2f})")
            get_quote_tweets(twitter, airtable, collection_id)


if __name__ == "__main__":
    main()
