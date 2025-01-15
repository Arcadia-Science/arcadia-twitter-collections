import pytest
from unittest.mock import Mock
import os
import sys

# Add the src directory to Python path
TEST_DIR = os.path.dirname(os.path.abspath(__file__))
SRC_DIR = os.path.join(os.path.dirname(TEST_DIR), 'src')
sys.path.insert(0, SRC_DIR)


@pytest.fixture
def mock_apis():
    # Sample entry data with realistic tweet IDs
    entry = {
        'id': 'rec123',
        'fields': {
            'Description': 'Test pub',
            'Search': 'https://research.arcadiascience.com/pub/test-pub',
            'Tweets': '1734567890123456789,1734567890123456790',
            'ID': 'test_collection_id'
        }
    }

    # Set up mocked APIs
    twitter = Mock()
    airtable = Mock()

    # Set up airtable mock
    airtable.get_database_entries = Mock(return_value=[entry])
    airtable.update_page = Mock()

    return {'twitter': twitter, 'airtable': airtable, 'entry': entry}


def test_quote_tweet_collection(mock_apis):
    from fetch_quote_tweets import get_quote_tweets

    # Set up mock quote tweet responses for each original tweet
    quote_tweets_by_id = {
        '1734567890123456789': [
            {'id': '1734567890123456888', 'text': 'Quote tweet 1'},
            {'id': '1734567890123456999', 'text': 'Quote tweet 2'}
        ],
        '1734567890123456790': [
            {'id': '1734567890123457111', 'text': 'Quote tweet 3'}
        ]
    }

    def mock_get_quote_tweets(tweet_id):
        return quote_tweets_by_id.get(tweet_id, [])

    mock_apis['twitter'].get_quote_tweets_for_tweet = Mock(side_effect=mock_get_quote_tweets)

    # Run the function
    get_quote_tweets(mock_apis['twitter'], mock_apis['airtable'], 'test_collection_id')

    # Check that quote tweets were fetched for both original tweets
    assert mock_apis['twitter'].get_quote_tweets_for_tweet.call_count == 2

    # Check that Airtable was updated with all tweets (original + quotes)
    update_calls = mock_apis['airtable'].update_page.call_args_list
    assert len(update_calls) > 0
    actual_call = update_calls[0]
    actual_id = actual_call[0][0]
    actual_tweets = set(actual_call[0][1]['Tweets'].split(','))
    expected_tweets = {
        '1734567890123456789',  # Original tweets
        '1734567890123456790',
        '1734567890123456888',  # Quote tweets
        '1734567890123456999',
        '1734567890123457111'
    }
    assert actual_id == 'rec123'
    assert actual_tweets == expected_tweets


def test_quote_tweet_error_handling(mock_apis):
    from fetch_quote_tweets import get_quote_tweets

    # Make the first quote tweet fetch fail but the second succeed
    def mock_get_quote_tweets(tweet_id):
        if tweet_id == '1734567890123456789':
            raise Exception("API Error")
        return [{'id': '1734567890123457111', 'text': 'Quote tweet 3'}]

    mock_apis['twitter'].get_quote_tweets_for_tweet = Mock(side_effect=mock_get_quote_tweets)

    # Run the function
    get_quote_tweets(mock_apis['twitter'], mock_apis['airtable'], 'test_collection_id')

    # Check that it tried both tweets despite the first error
    assert mock_apis['twitter'].get_quote_tweets_for_tweet.call_count == 2

    # Check that Airtable was updated with the successful quote tweet
    update_calls = mock_apis['airtable'].update_page.call_args_list
    assert len(update_calls) > 0
    actual_call = update_calls[0]
    actual_id = actual_call[0][0]
    actual_tweets = set(actual_call[0][1]['Tweets'].split(','))
    expected_tweets = {
        '1734567890123456789',  # Original tweets
        '1734567890123456790',
        '1734567890123457111'  # Quote tweet from successful fetch
    }
    assert actual_id == 'rec123'
    assert actual_tweets == expected_tweets


def test_no_quote_tweets_found(mock_apis):
    from fetch_quote_tweets import get_quote_tweets

    # Mock finding no quote tweets
    mock_apis['twitter'].get_quote_tweets_for_tweet.return_value = []

    # Run the function
    get_quote_tweets(mock_apis['twitter'], mock_apis['airtable'], 'test_collection_id')

    # Check that it tried both tweets
    assert mock_apis['twitter'].get_quote_tweets_for_tweet.call_count == 2

    # Check that Airtable was not updated since no new tweets were found
    assert mock_apis['airtable'].update_page.call_count == 0
