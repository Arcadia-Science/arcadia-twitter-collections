import math
import random
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Union
from urllib.parse import urlparse

ID_LENGTH = 18
RETWEET_STRING = "RT @"


def is_valid_http_url(text: str) -> bool:
    """Check if a string is a valid HTTP URL."""
    try:
        url = urlparse(text)
        return url.scheme in ["http", "https"]
    except Exception:
        return False


def parse_collection_timestamp(timestamp_str: str) -> datetime:
    """Parse Airtable's ISO timestamp format."""
    return datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))


def is_within_last_two_weeks(timestamp_str: str) -> bool:
    """Check if a timestamp is within the last two weeks."""
    timestamp = parse_collection_timestamp(timestamp_str)
    now = datetime.now(timezone.utc)
    two_weeks_ago = now - timedelta(weeks=2)
    return two_weeks_ago <= timestamp <= now


def calculate_priority(timestamp_str: str, decay_rate: float = 0.005) -> float:
    """Priority represents recency in a decaying fashion. Something that is just created has
    a priority of 1. Something that has been created 2 years ago, will have a priority of
    close to 0. The priority dictates the frequency of fetching tweets. So, something that
    is just created will have a higher chance of fetching tweets than something that is
    2 years old."""
    timestamp = parse_collection_timestamp(timestamp_str)
    now = datetime.now(timezone.utc)
    return math.exp(-decay_rate * (now - timestamp).days)


def parse_query_params(text: str) -> str:
    """Parse search parameters into Twitter query format."""
    if is_valid_http_url(text):
        return f'url:"{text}"'
    if text.startswith("#"):
        return text
    return f'"{text}"'


def search_params_to_query(terms: Union[str, List[str]]) -> str:
    """Convert search parameters to Twitter query string."""
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


def get_field_value(entry: Dict, field_name: str) -> str:
    """Get a field value from an Airtable record.
    """
    try:
        return str(entry['fields'].get(field_name, '')).strip()
    except (KeyError, TypeError):
        return ""


def generate_collection_id(entry: Dict) -> str:
    """Generate a new collection ID for an entry."""
    # Check required fields
    collection_name = get_field_value(entry, "Name")
    collection_description = get_field_value(entry, "Description")
    collection_search_params = get_field_value(entry, "Search")

    if not collection_name or not collection_description or not collection_search_params:
        raise ValueError("Collection missing name, description, or search params.")

    # Generate random ID that looks like a Twitter ID
    random_part = "".join(random.choices("0123456789", k=ID_LENGTH))
    return f"custom-{random_part}"


def filter_out_retweets(tweets: List[Dict]) -> List[Dict]:
    """Filter out retweets from a list of tweets."""
    return [tweet for tweet in tweets if not tweet["text"].startswith(RETWEET_STRING)]


def update_entry_tweets(airtable, entry: Dict, og_tweets: List[str], new_tweets=None) -> None:
    """Update the tweets field for an entry."""
    if new_tweets is None:
        new_tweets = []
    tweets_without_retweets = filter_out_retweets(new_tweets)

    if tweets_without_retweets:
        all_tweets = list(
            set(og_tweets + [str(tweet["id"]) for tweet in tweets_without_retweets])
        )

        if sorted(og_tweets) != sorted(all_tweets):
            tweets_string = ",".join(all_tweets)
            airtable.update_page(entry["id"], {"Tweets": tweets_string})
            print("Updated tweets for:", get_field_value(entry, "Description"))


def update_entry_collection_metadata(airtable, entry: Dict, collection_id: str,
                                     collection_url: str) -> None:
    """Update collection metadata fields."""
    airtable.update_page(entry["id"], {
        "ID": collection_id,
        "URL": collection_url
    })


def get_entry(airtable, collection_id: str) -> Union[Dict, None]:
    """Get an entry by its collection ID."""
    entries = airtable.get_database_entries()
    return next(
        (
            entry
            for entry in entries
            if get_field_value(entry, "ID") == collection_id
        ),
        None,
    )


def get_entry_tweets(entry: Dict) -> List[str]:
    """Get list of tweet IDs from an entry."""
    return [
        tweet.strip()
        for tweet in get_field_value(entry, "Tweets").split(",")
        if tweet.strip()
    ]
