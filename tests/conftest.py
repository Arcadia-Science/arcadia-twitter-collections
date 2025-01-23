import os
import pathlib

import dotenv
import pytest

from unittest.mock import Mock

ORIGINAL_ENV_VARS = os.environ.copy()


def _find_repo_dirpath():
    """
    Find the absolute path of the nearest local git repo.
    """
    current_dirpath = pathlib.Path(__file__).absolute()
    while True:
        if (current_dirpath / ".git").exists():
            return current_dirpath

        current_dirpath = current_dirpath.parent

        # This means we've reached the root of the filesystem.
        if current_dirpath == current_dirpath.parent:
            raise FileNotFoundError("Could not find the root of the local git repo.")


def pytest_sessionstart(session: pytest.Session) -> None:
    """
    This is a pytest hook that is automatically run before the start of the test session.
    """
    dotenv_filepath = _find_repo_dirpath() / ".env.test"
    dotenv.load_dotenv(dotenv_filepath, override=True)


def pytest_sessionfinish(session: pytest.Session) -> None:
    """
    This is a pytest hook that is automatically run after the end of the test session.
    """
    os.environ.clear()
    os.environ.update(ORIGINAL_ENV_VARS)


@pytest.fixture
def mock_apis():
    from field_constants import Fields

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
