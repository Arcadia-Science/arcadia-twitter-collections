from dotenv import load_dotenv
import os

from notion import NotionAPI
from utils import (
    get_rich_text_value,
    generate_collection_id,
    update_entry_collection_metadata,
)

load_dotenv()  # load environment variables from .env file

COLLECTION_URL_PREFIX = os.getenv("COLLECTION_URL_PREFIX")
NOTION_API_TOKEN = os.getenv("NOTION_API_TOKEN")
NOTION_DATABASE_ID = os.getenv("NOTION_DATABASE_ID")


def main():
    notion = NotionAPI(NOTION_API_TOKEN)

    entries = notion.get_database_entries(NOTION_DATABASE_ID)
    for entry in entries:
        collection_id = get_rich_text_value(entry, "ID")
        if not collection_id:
            try:
                new_id = generate_collection_id(entry)
                collection_url = COLLECTION_URL_PREFIX + new_id.replace("custom-", "")
                update_entry_collection_metadata(notion, entry, new_id, collection_url)
            except Exception as e:
                print(f"Error creating collection on Notion: {e}")


if __name__ == "__main__":
    main()
