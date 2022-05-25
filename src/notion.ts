require("dotenv").config();
import { Client } from "@notionhq/client";

interface TitleProperty {
  id: "title";
  type: "title";
  title: Record<string, string | Object>[];
}

interface RichTextProperty {
  id: string;
  type: "rich_text";
  rich_text: Record<string, string | Object>[];
}

interface CollectionEntryProperties {
  Name: TitleProperty;
  Description: RichTextProperty;
  Search: RichTextProperty;
  ID: RichTextProperty;
  URL: RichTextProperty;
}

type CollectionPropertyKeys = "Name" | "Description" | "Search" | "ID" | "URL";

export interface CollectionEntry {
  object: "page";
  id: string;
  properties: CollectionEntryProperties;
}

// Helpers to work with Notion's unnecessarily complex "Page" properties
export const getTitleValue = (
  entry: CollectionEntry,
  propertyName: CollectionPropertyKeys
) => {
  return (entry.properties[propertyName] as TitleProperty).title
    .map((section) => (section.plain_text as string)?.trim())
    .join("");
};

export const getRichTextValue = (
  entry: CollectionEntry,
  propertyName: CollectionPropertyKeys
) => {
  return (entry.properties[propertyName] as RichTextProperty).rich_text
    .map((section) => (section.plain_text as string)?.trim())
    .join("");
};

// Interacting with the Notion API
export class NotionAPI {
  private client: Client;

  constructor() {
    this.client = new Client({
      auth: process.env.NOTION_API_TOKEN,
    });
  }

  // For a given database ID, fetch its entries from Notion
  async getDatabaseEntries(id: string): Promise<CollectionEntry[]> {
    const response = await this.client.databases.query({
      database_id: id,
    });

    return response.results as CollectionEntry[];
  }

  // In Notion, every database entry is a page
  // This allows us to update the "Collection ID" property of a specific page/entry
  async updateEntryCollectionId(
    pageId: string,
    collectionId: string,
    collectionUrl: string
  ): Promise<CollectionEntry> {
    const response = await this.client.pages.update({
      page_id: pageId,
      properties: {
        ID: {
          rich_text: [
            {
              type: "text",
              text: {
                content: collectionId,
              },
            },
          ],
        },
        URL: {
          rich_text: [
            {
              type: "text",
              text: {
                content: collectionUrl,
              },
            },
          ],
        },
      },
    });

    return response as CollectionEntry;
  }
}
