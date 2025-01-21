import pytest
from unittest.mock import Mock


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

    return twitter,  airtable, entry
