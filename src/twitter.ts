require("dotenv").config();
import Twitter from "twitter";

const COLLECTION_NAME_CHAR_LIMIT = 25;
const COLLECTION_DESCRIPTION_CHAR_LIMIT = 160;

interface Tweet {
  id_str: string;
  text: string;
  full_text: string;
}

interface SearchResponse {
  statuses: Tweet[];
  search_metadata: Record<string, string>;
}

interface Collection {
  response: Record<"timeline_id", string>;
}

export const COLLECTION_URL_PREFIX =
  "https://twitter.com/ArcadiaScience/timelines/";

// Interacting with the Twitter API
export class TwitterAPI {
  private client: Twitter;

  constructor() {
    this.client = new Twitter({
      consumer_key: process.env.TWITTER_CONSUMER_KEY,
      consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
      access_token_key: process.env.TWITTER_ACCESS_TOKEN_KEY,
      access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
    });
  }

  // Search tweets based on terms
  async searchTweets(terms: string | string[]): Promise<SearchResponse> {
    const query = typeof terms === "string" ? terms : terms.join(" 0R ");
    return new Promise<SearchResponse>((resolve, reject) => {
      this.client.get(
        "search/tweets",
        { q: query, count: 100, includeEntities: false, result_type: "recent" },
        (err: Error, response: SearchResponse) =>
          err ? reject(err) : resolve(response)
      );
    });
  }

  // Create a Twitter collection with a specific name and description
  async createCollection(name: string, description: string): Promise<string> {
    // Enforce character limits (25 chars for name, 160 chars for description)
    if (
      name.length > COLLECTION_NAME_CHAR_LIMIT ||
      description.length > COLLECTION_DESCRIPTION_CHAR_LIMIT
    )
      throw new Error(
        "Collection name or description exceeds allowed character limit."
      );

    return new Promise<string>((resolve, reject) => {
      this.client.post(
        "collections/create",
        { name: name, description: description },
        (err: Error, collection: Collection) =>
          err ? reject(err) : resolve(collection.response.timeline_id)
      );
    });
  }

  // Fetch the specific Twitter collection by ID
  async getCollection(id: string): Promise<Collection> {
    return new Promise<Collection>((resolve, reject) => {
      this.client.post(
        "collections/show",
        { id: id },
        (err: Error, collection: Collection) =>
          err ? reject(err) : resolve(collection)
      );
    });
  }

  // Add specific tweet to a Twitter collection
  async addTweetToCollection(
    collectionId: string,
    tweetId: string
  ): Promise<Collection> {
    return new Promise<Collection>((resolve, reject) => {
      this.client.post(
        "collections/entries/add",
        { id: collectionId, tweet_id: tweetId },
        (err: Error, collection: Collection) =>
          err ? reject(err) : resolve(collection)
      );
    });
  }
}

// async function recentSearch(reqBody, nextToken) {
//   // validate requestBody before Search
//   var rcntSearch = reqBody.recentSearch;
//   let query = config.recent_search_url + '&query=' + rcntSearch.query + '&max_results=' + rcntSearch.maxResults;
//   if (nextToken != undefined && nextToken != null)
//     query = query + '&next_token=' + nextToken;
//   if (rcntSearch.startTime != undefined && rcntSearch.startTime != null)
//     query = query + '&start_time=' + rcntSearch.startTime;
//   if (rcntSearch.endTime != undefined && rcntSearch.endTime != null)
//     query = query + '&end_time=' + rcntSearch.endTime;
//   console.log('Recent search query : ', query);
//   return new Promise(function (resolve, reject) {
//     let userConfig = {
//       method: 'get',
//       url: query,
//       headers: { 'Authorization': config.twitter_bearer_token }
//     };
//     axios(userConfig)
//       .then(function (response) {
//         if (response.data.data != null) {
//           //console.log('response --',response.data);
//           bq_persist.insertSearchResults(response.data, reqBody);
//         }
//         if (response.data.meta != undefined && response.data.meta.next_token != undefined) {
//           recentSearch(reqBody, response.data.meta.next_token);
//         }
//         resolve('Recent Search results are persisted in database');
//       })
//       .catch(function (error) {
//         console.log('ERROR ',error.response.data);
//         reject(error.response.data);
//       });
//   });
// }
