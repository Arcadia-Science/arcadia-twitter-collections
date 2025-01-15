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
    search_params_to_query,
    update_entry_tweets,
)

load_dotenv()

ENVIRONMENT = os.getenv("ENVIRONMENT")
AIRTABLE_API_KEY = os.getenv("AIRTABLE_API_KEY")
AIRTABLE_BASE_ID = os.getenv("AIRTABLE_BASE_ID")
AIRTABLE_TABLE_NAME = os.getenv("AIRTABLE_TABLE_NAME")
TWITTER_BEARER_TOKEN = os.getenv("TWITTER_BEARER_TOKEN")


def get_tweets_for_entry(twitter, airtable, collection_id):
    """
    Fetch tweets for a specific collection based on its search parameters.
    """
    if not collection_id:
        return

    entry = get_entry(airtable, collection_id)
    if entry is None:
        return

    search_params = get_field_value(entry, "Search")
    search_query = search_params_to_query(search_params.split(","))

    og_tweets = get_entry_tweets(entry)
    print(f"Found {len(og_tweets)} existing tweets")

    last_tweet_id = max(og_tweets) if og_tweets else None

    try:
        print("Trying search with last_tweet_id...")
        new_tweets = twitter.search_tweets(
            query=search_query,
            last_tweet_id=last_tweet_id
        )
    except Exception:
        print("Trying search without last_tweet_id...")
        new_tweets = twitter.search_tweets(query=search_query, last_tweet_id=None)

    if new_tweets:
        print(f"Found {len(new_tweets)} new tweets")
        update_entry_tweets(airtable, entry, og_tweets, new_tweets)
    else:
        print("No new tweets found")


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

    # Need to use manual 'Created' field rather than createdTime because old entries were migrated
    entries_with_priority = [
        (entry, calculate_priority(get_field_value(entry,'Created date'))) for entry in entries
    ]
    entries_with_priority.sort(key=lambda x: x[1], reverse=True)

    # Process entries based on priority
    for entry, priority in entries_with_priority:
        collection_id = get_field_value(entry, "ID")
        if collection_id:
            # Skip based on priority (newer entries have higher chance of being processed)
            if random.random() > priority:
                continue

            search_params = get_field_value(entry, "Search")
            if not search_params:
                continue

            print(f"Fetching tweets for: {get_field_value(entry, "Description")} (priority: {priority:.2f})")
            get_tweets_for_entry(twitter, airtable, collection_id)


if __name__ == "__main__":
    main()
