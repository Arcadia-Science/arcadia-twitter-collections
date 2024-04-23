# arcadia-twitter-collections

## Update as of April 2024

- We have fully moved to a Python-based solution to leverage [Tweepy](https://docs.tweepy.org/en/latest/index.html) due to better support and maintenance.
- Going forward, the cron job runs via GitHub actions.

## Update as of June 2023

- Twitter decided to significantly change its API functionality and introduced a very steep pricing plan for its usage.
- As of now, Filtered Streams are prohibitively expensive to use (available at the $5K/month plan) and Twitter collections are not available at all.
- Because of this, we removed the reliance on Filtered Streams and rely solely on the search API. Quote tweets are also not used, because of its strict API rate limits and the inability to filter the quote tweets with `since_id`.
- Twitter collections are replaced by the addition of a comma-separated string field on the Notion database. We use Notion here for its simplicity and because it offers an easy to edit UI. However, it can be easily replaced with your favorite database technology. s

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

- A [periodic job](https://github.com/Arcadia-Science/arcadia-twitter-collections/blob/main/src/main.py) that sets up the [Twitter collections](https://developer.twitter.com/en/docs/twitter-api/v1/tweets/curate-a-collection/overview/about_collections). This job also backfills the tweets for the collection using the [Twitter API](https://developer.twitter.com/en/docs/twitter-api/v1/tweets/search/api-reference/get-search-tweets). The job runs via GitHub Actions actions every hour.

The configuration of what collections to create and what search terms to use are managed in a no-code way in [Notion](https://developers.notion.com/docs/getting-started).

If you have any questions about the implementation please reach out to [mertcelebi](https://github.com/mertcelebi).

## Getting started

### Create the environment file

Create `.env` file with:

```
// .env
TWITTER_BEARER_TOKEN=
NOTION_API_TOKEN=
NOTION_DATABASE_ID=
COLLECTION_URL_PREFIX=https://twitter.com/ArcadiaScience/timelines/
```

You can get the relevant environment variables through the [Twitter developer dashboard](https://developer.twitter.com/en/portal/dashboard). Note, this repo uses Twitter API v2.

### Install packages

This repository uses conda to manage the base development software environment.

You can find operating system-specific instructions for installing miniconda [here](https://docs.conda.io/projects/miniconda/en/latest/). After installing conda and [mamba](https://mamba.readthedocs.io/en/latest/), run the following command to create the pipeline run environment. This will createa a minimal virtual environment.

```{bash}
mamba env create -n twitter-collections --file dev.yml
mamba activate twitter-collections
```

Install packages using pip. We use pip in addition to conda, to not duplicate package management locally vs. on GitHub actions.

```
pip install -r requirements.txt
```

Once the installation is complete, you can run the job with `python src/main.py`.

## Using Notion as the database

This project was built under a tight timeline. It needed a data store to host all the Twitter collection metadata (name, description, search parameters). Non-technical people had to be able to modify the metadata to manage collections.

[Arcadia Science](https://www.arcadiascience.com/) uses Notion for our internal team wiki. So instead of storing this data in a heavy-duty database and exposing a UI on top of it for modifications, we decided to use Notion to host this data.

If you care for the Notion API module used as part of this repository check out [here](https://github.com/Arcadia-Science/arcadia-twitter-collections/blob/main/src/notion.ts).

If you care for the Twitter API module used as part of this repository check out [here](https://github.com/Arcadia-Science/arcadia-twitter-collections/blob/main/src/twitter.ts).

## Using Twitter v1.1 and v2 endpoints

Twitter unfortunately removed the [collections functionality](https://developer.twitter.com/en/docs/twitter-api/v1/tweets/curate-a-collection/overview/about_collections) in their API v2. So, if you need to use collections, you need access to API v1.1. For this you need "Elevated" API access on Twitter which requires a simple application. Our application took less than 24 hours to get approved.

You can use the search functionality present in API v1.1, but we decided to use API v2 for the search functionality since it's more robust and allows more flexibility (direct search vs. FilteredStreams).

First time a collection is created, this project uses the [v2 recent search endpoint](https://developer.twitter.com/en/docs/twitter-api/tweets/search/api-reference/get-tweets-search-recent) for backfilling relevant tweets and for each tweet fetches all [its quote tweets](https://developer.twitter.com/en/docs/twitter-api/tweets/quote-tweets/api-reference/get-tweets-id-quote_tweets). This is suboptimal and inelegant. Sadly, the recent search endpoint does not match quote tweets based on the search query.
