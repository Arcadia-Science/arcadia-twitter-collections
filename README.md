# arcadia-twitter-collections

## Goals of the project

### Context

- A lot of discourse around scientific publications happen on Twitter.
- For a given publication, [Arcadia Science](https://www.arcadiascience.com/) would like to collect relevant tweets (based on DOI number or URL) and display these on the publication page for broader visibility and engagement.
- Currently, there isn’t an easy way to have a collection of tweets based on a search query (ie DOI number or URL). This is because Twitter API was modified in 2018 to deprecate this functionality.
- We'd like to have a collection of tweets specific to each publication embeddable on our publishing platform, [PubPub](https://research.arcadiascience.com/).

### Desired functionality

- Easily create a new Twitter collection per pub
- Specify what search terms should be used for populating the tweets for the collection
- Automate the process of populating the tweets for the collection using Twitter’s API
- Easily embed the created collection on our publication platform

## Solution

To fulfill these goals, this repo implements two services:

- A [periodic job](https://github.com/Arcadia-Science/arcadia-twitter-collections/blob/main/src/collectionCronJob.ts) that sets up the [Twitter collections](https://developer.twitter.com/en/docs/twitter-api/v1/tweets/curate-a-collection/overview/about_collections) and their respective [filtered streams](https://developer.twitter.com/en/docs/twitter-api/tweets/filtered-stream/introduction). This job also backfills the tweets for the collection using the [Twitter API](https://developer.twitter.com/en/docs/twitter-api/v1/tweets/search/api-reference/get-search-tweets). The job runs on [Render](https://dashboard.render.com/) every 5 minutes using their [Cron job](https://render.com/docs/cronjobs) service.
- An [ongoing server](https://github.com/Arcadia-Science/arcadia-twitter-collections/blob/main/src/filteredStream.ts) that listens for the Twitter API FilteredStream events. The server runs on [Render](https://dashboard.render.com/) using their [background workers](https://render.com/docs/background-workers) service.

The configuration of what collections to create and what search terms to use are managed in a no-code way in [Notion](https://developers.notion.com/docs/getting-started).

If you have any questions about the implementation please reach out to [mertcelebi](https://github.com/mertcelebi).

## Getting started

Create `.env` file with:

```
// .env
TWITTER_CONSUMER_KEY=
TWITTER_CONSUMER_SECRET=
TWITTER_ACCESS_TOKEN_KEY=
TWITTER_ACCESS_TOKEN_SECRET=
TWITTER_BEARER_TOKEN=
NOTION_API_TOKEN=
NOTION_DATABASE_ID=
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

Once the installation is complete, you can build the job with `yarn build` or `yarn watch`.

### Running the services

You can run the job manually with `yarn runJob` and the stream with `yarn stream` locally.

### Deploying the cron job

The job runs on [Render](https://dashboard.render.com/) every 5 minutes using their [Cron job](https://render.com/docs/cronjobs) service.

This README will not go through the full configuration process since Render's documentation around their cron job service is robust. But please see the attached configuration as an example.

<img width="982" alt="cron" src="https://user-images.githubusercontent.com/2692053/176502681-f4e8ed42-960d-489f-a732-e3e2c3bd47a7.png">

### Deploying the server for the filtered stream

The server runs on [Render](https://dashboard.render.com/) using their [background workers](https://render.com/docs/background-workers) service.

This README will not go through the full configuration process since Render's documentation around their cron job service is robust. But please see the attached configuration as an example.

<img width="992" alt="stream" src="https://user-images.githubusercontent.com/2692053/176502717-590dd080-3f79-4f50-9f56-9e8428913de3.png">

## Using Notion as the database

This project was built under a tight timeline. It needed a data store to host all the Twitter collection metadata (name, description, search parameters). Non-technical people had to be able to modify the metadata to manage collections.

[Arcadia Science](https://www.arcadiascience.com/) uses Notion for our internal team wiki. So instead of storing this data in a heavy-duty database and exposing a UI on top of it for modifications, we decided to use Notion to host this data.

If you care for the Notion API module used as part of this repository check out [here](https://github.com/Arcadia-Science/arcadia-twitter-collections/blob/main/src/notion.ts).

If you care for the Twitter API module used as part of this repository check out [here](https://github.com/Arcadia-Science/arcadia-twitter-collections/blob/main/src/twitter.ts).

## Using Twitter v1.1 and v2 endpoints

Twitter unfortunately removed the [collections functionality](https://developer.twitter.com/en/docs/twitter-api/v1/tweets/curate-a-collection/overview/about_collections) in their API v2. So, if you need to use collections, you need access to API v1.1. For this you need "Elevated" API access on Twitter which requires a simple application. Our application took less than 24 hours to get approved.

You can use the search functionality present in API v1.1, but we decided to use API v2 for the search functionality since it's more robust and allows more flexibility (direct search vs. FilteredStreams).

First time a collection is created, this project uses the [v2 recent search endpoint](https://developer.twitter.com/en/docs/twitter-api/tweets/search/api-reference/get-tweets-search-recent) for backfilling relevant tweets and for each tweet fetches all [its quote tweets](https://developer.twitter.com/en/docs/twitter-api/tweets/quote-tweets/api-reference/get-tweets-id-quote_tweets). This is suboptimal and inelegant. Sadly, the recent search endpoint does not match quote tweets based on the search query.
