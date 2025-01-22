import sys
from pathlib import Path

sys.path.append(str(Path(__file__).parent.parent))

import pytest
from unittest.mock import Mock
from field_constants import Fields


@pytest.fixture
def mock_apis():
    entry = {
        'id': 'rec123',
        'fields': {
            Fields.DESCRIPTION: 'Test pub',
            Fields.SEARCH: 'https://research.arcadiascience.com/pub/test-pub',
            Fields.TWEETS: '1734567890123456789,1734567890123456790',
            Fields.ID: 'test_collection_id'
        }
    }

    twitter = Mock()
    airtable = Mock()

    airtable.get_database_entries = Mock(return_value=[entry])
    airtable.update_page = Mock()

    return twitter, airtable, entry
