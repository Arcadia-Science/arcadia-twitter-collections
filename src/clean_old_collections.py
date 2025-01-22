import os
from field_constants import Fields

from dotenv import load_dotenv

from airtable import AirtableAPI
from twitter import TwitterAPI
from utils import get_field_value, RETWEET_STRING

load_dotenv()

ENVIRONMENT = os.getenv("ENVIRONMENT")
AIRTABLE_API_KEY = os.getenv("AIRTABLE_API_KEY")
AIRTABLE_BASE_ID = os.getenv("AIRTABLE_BASE_ID")
AIRTABLE_TABLE_ID = os.getenv("AIRTABLE_TABLE_ID")
TWITTER_BEARER_TOKEN = os.getenv("TWITTER_BEARER_TOKEN")


def main():
    """
    This script cleans up old collections by removing retweets from the list of tweets.
    """
    # Initialize API clients
    twitter = TwitterAPI(TWITTER_BEARER_TOKEN, cache=ENVIRONMENT == "local")
    airtable = AirtableAPI(
        api_key=AIRTABLE_API_KEY,
        base_id=AIRTABLE_BASE_ID,
        table_name=AIRTABLE_TABLE_ID
    )

    # Get all entries
    entries = airtable.get_database_entries()
    for entry in entries:
        collection_id = get_field_value(entry, Fields.ID)
        if not collection_id:
            continue

        # Get current tweets
        entry_tweets = [
            tweet.strip()
            for tweet in get_field_value(entry, Fields.TWEETS).split(",")
            if tweet.strip()
        ]

        if not entry_tweets:
            continue

        try:
            # Fetch tweet content to check for retweets
            tweets = twitter.get_tweets(entry_tweets)
            if not tweets.data:
                continue

            tweets_to_remove = []
            for tweet in tweets.data:
                if tweet.text.startswith(RETWEET_STRING):
                    tweets_to_remove.append(str(tweet.id))

            if tweets_to_remove:
                # Remove retweets from the list
                cleaned_tweets = [t for t in entry_tweets if t not in tweets_to_remove]
                print(f"Removing {len(tweets_to_remove)} retweets from collection {collection_id}")

                # Update the entry with cleaned tweet list
                airtable.update_page(
                    entry["id"],
                    {Fields.TWEETS: ",".join(cleaned_tweets)}
                )

        except Exception as e:
            print(f"Error processing collection {collection_id}: {e}")
            continue


if __name__ == "__main__":
    main()
