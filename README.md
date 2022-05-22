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
