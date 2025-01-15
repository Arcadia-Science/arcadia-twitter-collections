import pytest
from unittest.mock import Mock
import os
import sys

# Add the src directory to Python path so I can avoid restructuring this project
TEST_DIR = os.path.dirname(os.path.abspath(__file__))
SRC_DIR = os.path.join(os.path.dirname(TEST_DIR), 'src')
sys.path.insert(0, SRC_DIR)


@pytest.fixture
def mock_apis():
    entry = {
        'id': 'rec123',
        'fields': {
            'Description': 'Test pub',
            'Search': 'https://research.arcadiascience.com/pub/test-pub',
            'Tweets': '1734567890123456789,1734567890123456790',
            'ID': 'test_collection_id'
        }
    }

    twitter = Mock()
    airtable = Mock()

    airtable.get_database_entries = Mock(return_value=[entry])
    airtable.update_page = Mock()

    return {'twitter': twitter, 'airtable': airtable, 'entry': entry}


def test_tweet_collection_and_storage(mock_apis):
    from fetch_tweets import get_tweets_for_entry

    new_tweet = {
        'id': '1734567890123456791',
        'text': 'New tweet! https://research.arcadiascience.com/pub/test-pub'
    }

    mock_apis['twitter'].search_tweets.return_value = [new_tweet]
    get_tweets_for_entry(mock_apis['twitter'], mock_apis['airtable'], 'test_collection_id')

    expected_query = 'url:"https://research.arcadiascience.com/pub/test-pub" -is:retweet'
    expected_last_id = '1734567890123456790'
    search_calls = mock_apis['twitter'].search_tweets.call_args_list
    assert len(search_calls) > 0
    actual_args = search_calls[0][1]
    assert actual_args['query'] == expected_query
    assert actual_args['last_tweet_id'] == expected_last_id

    update_calls = mock_apis['airtable'].update_page.call_args_list
    assert len(update_calls) > 0
    actual_call = update_calls[0]
    actual_id = actual_call[0][0]
    actual_tweets = set(actual_call[0][1]['Tweets'].split(','))
    expected_tweets = {'1734567890123456789', '1734567890123456790', '1734567890123456791'}
    assert actual_id == 'rec123'
    assert actual_tweets == expected_tweets


def test_error_handling_and_fallback(mock_apis):
    from fetch_tweets import get_tweets_for_entry

    mock_apis['twitter'].search_tweets.side_effect = [
        Exception("Search failed"),
        [{'id': '1734567890123456792', 'text': 'Fallback tweet'}]
    ]

    get_tweets_for_entry(mock_apis['twitter'], mock_apis['airtable'], 'test_collection_id')

    assert mock_apis['twitter'].search_tweets.call_count == 2

    last_call_args = mock_apis['twitter'].search_tweets.call_args_list[1][1]
    assert last_call_args.get('last_tweet_id') is None

    update_calls = mock_apis['airtable'].update_page.call_args_list
    assert len(update_calls) > 0
    actual_call = update_calls[0]
    actual_id = actual_call[0][0]
    actual_tweets = set(actual_call[0][1]['Tweets'].split(','))
    expected_tweets = {'1734567890123456789', '1734567890123456790', '1734567890123456792'}
    assert actual_id == 'rec123'
    assert actual_tweets == expected_tweets
