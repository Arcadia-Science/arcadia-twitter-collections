from dotenv import load_dotenv
import os

from airtable import AirtableAPI
from utils import (
    get_field_value,
    generate_collection_id,
    update_entry_collection_metadata,
)

load_dotenv()

COLLECTION_URL_PREFIX = os.getenv("COLLECTION_URL_PREFIX")
AIRTABLE_API_KEY = os.getenv("AIRTABLE_API_KEY")
AIRTABLE_BASE_ID = os.getenv("AIRTABLE_BASE_ID")
AIRTABLE_TABLE_NAME = os.getenv("AIRTABLE_TABLE_NAME")


def main():
    """
    Creates new collections for entries that don't have an ID yet.
    Each collection gets a unique ID and URL based on the collection URL prefix.
    """
    airtable = AirtableAPI(
        api_key=AIRTABLE_API_KEY,
        base_id=AIRTABLE_BASE_ID,
        table_name=AIRTABLE_TABLE_NAME
    )

    entries = airtable.get_database_entries()
    for entry in entries:
        collection_id = get_field_value(entry, "ID")
        if not collection_id:
            try:
                new_id = generate_collection_id(entry)
                collection_url = COLLECTION_URL_PREFIX + new_id.replace("custom-", "")
                update_entry_collection_metadata(airtable, entry, new_id, collection_url)
                print(f"Created collection {new_id} for entry {entry['id']}")
            except Exception as e:
                print(f"Error creating collection: {e}")


if __name__ == "__main__":
    main()
