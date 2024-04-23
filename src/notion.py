from notion_client import Client


class NotionAPI:
    def __init__(self, notion_token):
        self.client = Client(auth=notion_token)

    def get_database_entries(self, database_id):
        entries = self.client.databases.query(database_id=database_id)
        if entries.get("object") == "list":
            return entries.get("results")
        return []

    def update_page(self, page_id, properties):
        return self.client.pages.update(page_id=page_id, properties=properties)
