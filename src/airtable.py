from pyairtable import Table
from typing import List, Dict, Optional


class AirtableAPI:
    def __init__(self, api_key: str, base_id: str, table_name: str):
        """Initialize Airtable client with credentials.

        Args:
            api_key: Airtable API key
            base_id: Airtable base ID
            table_name: Name of the table to interact with
        """
        self.table = Table(api_key, base_id, table_name)

    def get_database_entries(self) -> List[Dict]:
        """Get all entries from the database.
        Maintains same interface as original notion.py.

        Returns:
            List of record dictionaries containing fields and metadata
        """
        try:
            return self.table.all(use_field_ids=True)
        except Exception as e:
            print(f"Error fetching entries from Airtable: {e}")
            return []

    def update_page(self, record_id: str, properties: Dict) -> Optional[Dict]:
        """Update a record in Airtable.
        Maintains same interface as original notion.py.

        Args:
            record_id: ID of record to update
            properties: Dictionary of field values to update

        Returns:
            Updated record dictionary or None if update failed
        """
        try:
            return self.table.update(record_id, properties)
        except Exception as e:
            print(f"Error updating record in Airtable: {e}")
            return None

    def get_record(self, record_id: str) -> Optional[Dict]:
        """Get a specific record by ID.

        Args:
            record_id: ID of record to retrieve

        Returns:
            Record dictionary or None if not found
        """
        try:
            return self.table.get(record_id, use_field_ids=True)
        except Exception as e:
            print(f"Error fetching record from Airtable: {e}")
            return None

    def create_record(self, fields: Dict) -> Optional[Dict]:
        """Create a new record in Airtable.

        Args:
            fields: Dictionary of field values for the new record

        Returns:
            Created record dictionary or None if creation failed
        """
        try:
            return self.table.create(fields)
        except Exception as e:
            print(f"Error creating record in Airtable: {e}")
            return None
