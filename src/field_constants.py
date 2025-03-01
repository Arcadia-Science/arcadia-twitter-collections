from dotenv import load_dotenv
import os

load_dotenv()

class Fields:
    """
    The Airtable IDs of the fields in the Airtable table that stores the tweet collections.
    """

    # A collection ID generated by the create_collections.py script. 
    # Note that this is distinct from Airtable's internal record ID.
    ID = os.getenv("AIRTABLE_FIELD_ID_COLLECTION_ID")

    # The text that appears at the top of the embeddable collection.
    NAME = os.getenv("AIRTABLE_FIELD_ID_NAME")

    # The name of the pub. Does not support rich text.
    DESCRIPTION = os.getenv("AIRTABLE_FIELD_ID_DESCRIPTION")

    # The Twitter search queries. This consists of the PubPub url and the DOI url, separated by a comma.
    SEARCH = os.getenv("AIRTABLE_FIELD_ID_SEARCH")

    # The URL of the [publishing-tools](https://github.com/Arcadia-Science/publishing-tools)
    # collection that will be embedded.
    URL = os.getenv("AIRTABLE_FIELD_ID_URL")

    # A comma-separated list of tweet IDs.
    TWEETS = os.getenv("AIRTABLE_FIELD_ID_TWEETS")

    # The date the collection was created, in ISO 8601 format.
    CREATED_DATE = os.getenv("AIRTABLE_FIELD_ID_CREATED_DATE")
