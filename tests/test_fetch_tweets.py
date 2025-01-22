from src.field_constants import Fields


def test_get_tweets_for_entry(mock_apis):
    twitter, airtable, entry = mock_apis
    from fetch_tweets import get_tweets_for_entry

    new_tweet = {
        'id': '1734567890123456791',
        'text': 'New tweet! https://research.arcadiascience.com/pub/test-pub'
    }

    twitter.search_tweets.return_value = [new_tweet]
    get_tweets_for_entry(twitter, airtable, 'test_collection_id')

    expected_query = 'url:"https://research.arcadiascience.com/pub/test-pub" -is:retweet'
    expected_last_id = '1734567890123456790'
    search_calls = twitter.search_tweets.call_args_list
    assert len(search_calls) > 0
    actual_args = search_calls[0][1]
    assert actual_args['query'] == expected_query
    assert actual_args['last_tweet_id'] == expected_last_id

    update_calls = airtable.update_page.call_args_list
    assert len(update_calls) > 0
    actual_call = update_calls[0]
    actual_id = actual_call[0][0]
    actual_tweets = set(actual_call[0][1][Fields.TWEETS].split(','))
    expected_tweets = {'1734567890123456789', '1734567890123456790', '1734567890123456791'}
    assert actual_id == 'rec123'
    assert actual_tweets == expected_tweets


def test_get_tweets_for_entry_error_handling(mock_apis):
    twitter, airtable, entry = mock_apis
    from fetch_tweets import get_tweets_for_entry

    twitter.search_tweets.side_effect = [
        Exception("Search failed"),
        [{'id': '1734567890123456792', 'text': 'Fallback tweet'}]
    ]

    get_tweets_for_entry(twitter, airtable, 'test_collection_id')

    assert twitter.search_tweets.call_count == 2

    last_call_args = twitter.search_tweets.call_args_list[1][1]
    assert last_call_args.get('last_tweet_id') is None

    update_calls = airtable.update_page.call_args_list
    assert len(update_calls) > 0
    actual_call = update_calls[0]
    actual_id = actual_call[0][0]
    actual_tweets = set(actual_call[0][1][Fields.TWEETS].split(','))
    expected_tweets = {'1734567890123456789', '1734567890123456790', '1734567890123456792'}
    assert actual_id == 'rec123'
    assert actual_tweets == expected_tweets
