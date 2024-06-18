from dotenv import load_dotenv
import os
import random

from notion import NotionAPI
from twitter import TwitterAPI
from utils import (
    calculate_priority,
    get_entry,
    get_entry_tweets,
    get_rich_text_value,
    search_params_to_query,
    update_entry_tweets,
)

load_dotenv()  # load environment variables from .env file

ENVIRONMENT = os.getenv("ENVIRONMENT")
NOTION_API_TOKEN = os.getenv("NOTION_API_TOKEN")
NOTION_DATABASE_ID = os.getenv("NOTION_DATABASE_ID")
TWITTER_BEARER_TOKEN = os.getenv("TWITTER_BEARER_TOKEN")


def get_tweets_for_entry(twitter, notion, collection_id):
    if not collection_id:
        return

    # Re-fetch the entry to make sure it's up-to-date
    entry = get_entry(notion, NOTION_DATABASE_ID, collection_id)

    if entry is None:
        return

    search_params = get_rich_text_value(entry, "Search")
    search_query = search_params_to_query(search_params.split(","))

    og_tweets = get_entry_tweets(entry)
    last_tweet_id = max(og_tweets) if og_tweets else None

    try:
        new_tweets = twitter.search_tweets(
            query=search_query, last_tweet_id=last_tweet_id
        )
    except Exception:
        new_tweets = twitter.search_tweets(query=search_query, last_tweet_id=None)

    update_entry_tweets(notion, entry, og_tweets, new_tweets)


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
            search_params = get_rich_text_value(entry, "Search")
            if not search_params:
                continue
            print("Fetching tweets for:", entry["id"])
            get_tweets_for_entry(twitter, notion, collection_id)


if __name__ == "__main__":
    main()
