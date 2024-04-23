from datetime import datetime, timedelta, timezone
import random
from urllib.parse import urlparse

RETWEET_STRING = "RT @"
ID_LENGTH = 18


def is_valid_http_url(text):
    try:
        url = urlparse(text)
        return url.scheme in ["http", "https"]
    except Exception:
        return False


def is_within_last_two_weeks(timestamp_str):
    timestamp = datetime.strptime(timestamp_str, "%Y-%m-%dT%H:%M:%S.%fZ").replace(
        tzinfo=timezone.utc
    )
    now = datetime.now(timezone.utc)
    two_weeks_ago = now - timedelta(weeks=2)
    return two_weeks_ago <= timestamp <= now


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


def update_entry_tweets(notion, entry, tweets):
    tweets_string = ",".join(tweets)
    params = dict_to_rich_text_obj({"Tweets": tweets_string})
    notion.update_page(entry["id"], params)


def update_entry_collection_metadata(notion, entry, collection_id, collection_url):
    params = dict_to_rich_text_obj({"ID": collection_id, "URL": collection_url})
    notion.update_page(entry["id"], params)
