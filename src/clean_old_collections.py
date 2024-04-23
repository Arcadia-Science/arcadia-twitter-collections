from dotenv import load_dotenv
import os

from notion import NotionAPI
from twitter import TwitterAPI
from utils import get_rich_text_value, update_entry_tweets, RETWEET_STRING

load_dotenv()  # load environment variables from .env file

ENVIRONMENT = os.getenv("ENVIRONMENT")
NOTION_API_TOKEN = os.getenv("NOTION_API_TOKEN")
NOTION_DATABASE_ID = os.getenv("NOTION_DATABASE_ID")
TWITTER_BEARER_TOKEN = os.getenv("TWITTER_BEARER_TOKEN")


def main():
    twitter = TwitterAPI(TWITTER_BEARER_TOKEN, cache=ENVIRONMENT == "local")
    notion = NotionAPI(NOTION_API_TOKEN)

    entries = notion.get_database_entries(NOTION_DATABASE_ID)
    for entry in entries:
        collectionId = get_rich_text_value(entry, "ID")

        if collectionId:
            entry_tweets = [
                tweet.strip()
                for tweet in get_rich_text_value(entry, "Tweets").split(",")
                if tweet.strip()
            ]

            if entry_tweets:
                tweets = twitter.get_tweets(entry_tweets)
                for tweet in tweets.data:
                    if tweet.text.startswith(RETWEET_STRING):
                        entry_tweets.remove(str(tweet.id))

                update_entry_tweets(notion, entry, entry_tweets)


if __name__ == "__main__":
    main()
