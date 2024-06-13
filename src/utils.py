from datetime import datetime, timedelta, timezone
import math
import os
import random
from urllib.parse import urlparse

ID_LENGTH = 18
NOTION_DATABASE_ID = os.getenv("NOTION_DATABASE_ID")
RETWEET_STRING = "RT @"


def is_valid_http_url(text):
    try:
        url = urlparse(text)
        return url.scheme in ["http", "https"]
    except Exception:
        return False


def parse_collection_timestamp(timestamp_str):
    return datetime.strptime(timestamp_str, "%Y-%m-%dT%H:%M:%S.%fZ").replace(
        tzinfo=timezone.utc
    )


def is_within_last_two_weeks(timestamp_str):
    timestamp = parse_collection_timestamp(timestamp_str)
    now = datetime.now(timezone.utc)
    two_weeks_ago = now - timedelta(weeks=2)
    return two_weeks_ago <= timestamp <= now


def calculate_priority(timestamp_str, decay_rate=0.005):
    timestamp = parse_collection_timestamp(timestamp_str)
    now = datetime.now(timezone.utc)
    return math.exp(-decay_rate * (now - timestamp).days)


def parse_query_params(text):
    if is_valid_http_url(text):
        return f'url:"{text}"'
    if text.startswith("#"):
        return text
    else:
        return f'"{text}"'


def search_params_to_query(terms):
    base_query = "-is:retweet"
    if isinstance(terms, str):
        query = parse_query_params(terms.strip()) + " " + base_query
    else:
        query = (
            " OR ".join(parse_query_params(term.strip()) for term in terms)
            + " "
            + base_query
        )
    return query


def get_title_value(entry, property_name):
    try:
        return "".join(
            [
                section["plain_text"].strip()
                for section in entry["properties"][property_name]["title"]
                if "plain_text" in section
            ]
        )
    except (KeyError, TypeError):
        return ""


def get_rich_text_value(entry, property_name):
    try:
        return "".join(
            [
                section["plain_text"].strip()
                for section in entry["properties"][property_name]["rich_text"]
                if "plain_text" in section
            ]
        )
    except (KeyError, TypeError):
        return ""


def generate_collection_id(entry):
    # Make sure all relevant fields are there
    collection_name = get_title_value(entry, "Name")
    collection_description = get_rich_text_value(entry, "Description")
    collection_search_params = get_rich_text_value(entry, "Search")

    if (
        not collection_name
        or not collection_description
        or not collection_search_params
    ):
        raise ValueError("Collection missing name, description, or search params.")

    # Make IDs look like Twitter IDs, this should be reasonably unique for our use-case
    random_part = "".join(random.choices("0123456789", k=ID_LENGTH))
    return f"custom-{random_part}"


def dict_to_rich_text_obj(data_dict):
    properties = {}
    for key, value in data_dict.items():
        properties[key] = {"rich_text": [{"type": "text", "text": {"content": value}}]}
    return properties


def filter_out_retweets(tweets):
    return [tweet for tweet in tweets if not tweet["text"].startswith(RETWEET_STRING)]


def update_entry_tweets(notion, entry, og_tweets, new_tweets):
    # Here, we manually filter out retweets because the Twitter API doesn't allow us to
    # reliably do so. Even if the -retweet flag is set, the API occasionally returns retweets.
    tweets_without_retweets = filter_out_retweets(new_tweets)

    if tweets_without_retweets:
        all_tweets = list(
            set(og_tweets + [str(tweet["id"]) for tweet in tweets_without_retweets])
        )

        if sorted(og_tweets) != sorted(all_tweets):
            tweets_string = ",".join(all_tweets)
            params = dict_to_rich_text_obj({"Tweets": tweets_string})
            notion.update_page(entry["id"], params)


def update_entry_collection_metadata(notion, entry, collection_id, collection_url):
    params = dict_to_rich_text_obj({"ID": collection_id, "URL": collection_url})
    notion.update_page(entry["id"], params)


def get_entry(notion, collection_id):
    entries = notion.get_database_entries(NOTION_DATABASE_ID)
    return next(
        (entry for entry in entries if get_title_value(entry, "ID") == collection_id),
        None,
    )


def get_entry_tweets(entry):
    return [
        tweet.strip()
        for tweet in get_rich_text_value(entry, "Tweets").split(",")
        if tweet.strip()
    ]
