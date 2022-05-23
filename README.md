# arcadia-twitter-collections

This repo implements a periodic job that pulls relevant tweets from the [Twitter API](https://developer.twitter.com/en/docs/twitter-api/v1/tweets/search/api-reference/get-search-tweets) (based on search params) and adds them to publication specific [Twitter collections](https://developer.twitter.com/en/docs/twitter-api/v1/tweets/curate-a-collection/overview/about_collections). The job runs on [Render](https://dashboard.render.com/) every 5 minutes using their [Cron job](https://render.com/docs/cronjobs) service.

The configuration of what collections to create and what search terms to use are managed in a no-code way in [Notion](https://developers.notion.com/docs/getting-started).

If you have any questions about the implementation please reach out to [mertcelebi](https://github.com/mertcelebi).

#### Getting started

Create `.env` file with:

```
// .env
TWITTER_CONSUMER_KEY=
TWITTER_CONSUMER_SECRET=
TWITTER_ACCESS_TOKEN_KEY=
TWITTER_ACCESS_TOKEN_SECRET=
TWITTER_BEARER_TOKEN=
NOTION_API_TOKEN=
```

You can get the relevant environment variables through the [Twitter developer dashboard](https://developer.twitter.com/en/portal/dashboard). Note, this repo uses Twitter API v1.1. For that you need "Elevated" access as some of the endpoints in v2 are deprecated.

Install packages using [yarn](https://yarnpkg.com/en/).

```
yarn
```

If you run into issues, you may have to create `yarn.lock` manually:

```
touch yarn.lock
```

Once the installation is complete, you can build the job with `yarn build` or `yarn watch`. You can run the script with `node dist/index.js`

#### Using Notion as the database

This project was built under a tight timeline. It needed a data store to host all the Twitter collection metadata (name, description, search parameters). Non-technical people had to be able to modify the metadata to manage collections.

Arcadia Science uses Notion for our internal team wiki. So instead of storing this data in a heavy-duty database and exposing a UI on top of it for modifications, we decided to use Notion to host this data.

So, all the Twitter collection logic may be irrelevant for you. Luckily, those parts are clearly delinated in the codebase.

#### Using Twitter v1.1 and v2 endpoints

Twitter unfortunately removed the [collections functionality](https://developer.twitter.com/en/docs/twitter-api/v1/tweets/curate-a-collection/overview/about_collections) in their API v2. So, if you need to use collections, you need access to API v1.1. For this you need "Elevated" API access on Twitter which requires a simple application. Our application took less than 24 hours to get approved.

You can use the search functionality present in API v1.1, but we decided to use API v2 for the search functionality since it's more robust and allows more flexibility (direct search vs. FilteredStreams).

This project uses the [v2 recent search endpoint](https://developer.twitter.com/en/docs/twitter-api/tweets/search/api-reference/get-tweets-search-recent) for fetching relevant tweets and for each tweet fetches all [its quote tweets](https://developer.twitter.com/en/docs/twitter-api/tweets/quote-tweets/api-reference/get-tweets-id-quote_tweets). This is suboptimal and inelegant. Sadly, the recent search endpoint does not match quote tweets based on the search query.

You'll also notice that every single time this job runs, it fetches all the available tweets as far the search endpoint goes (7 days). This is also suboptimal and quite brute-force. But this allowed us to finish the project on time and was a reasonable trade-off since we don't expect a large volume of tweets.

Ideally, this project would use the `FilteredStream` [API endpoints](https://developer.twitter.com/en/docs/twitter-api/tweets/filtered-stream/api-reference) to manage rules tagged by collection ID. But the documentation around `FilteredStream` API endpoints is sparse, and its usage requires a lot of battle testing to make sure the stream doesn't miss tweets during moments of disconnects.
