# arcadia-twitter-collections

## Update as of January 2025

The overall flow of Twitter collections for Arcadia pubs is as follows:
1. When a pub is marked as ready to release in Airtable, an Airtable automation creates a new collection with the required metadata in the Twitter collections table. Then, `create_collections.yml` dispatch is triggered and populates the Twitter collection URL.
2. `fetch_tweets.yml` and `fetch_quote_tweets.yml` run on a cron as described in this README and store new tweet IDs in the Twitter collections table
3. The URL to the collection is linked to the pub record and is automatically pulled in by PubPub Platform when creating new pubs

- We have transitioned to using Airtable to hold Twitter collections rather than Notion:
  - As part of Arcadia's move to PubPub Platform, much of each pub's metadata will be stored in Airtable to make sure that our internal systems are not duplicating information on PubPub, reducing errors. Generating and storing Twitter collections on Airtable allows it to automatically pull into PubPub.
  - Airtable's structure is simpler than Notion's, allowing some streamlining of the scripts in this repo.
  - `create_collections.yml` can now be triggered as a `repository_dispatch` event, so we don't need to run a cron every five minutes.

## Update as of June 2024

- We separated the singular cron job to multiple cron jobs to better deal with different rate limits. Collection creation (that happens outside the Twitter context) is run every 5 minutes. Fetching tweets per collection runs every 2 hours. Fetching quote tweets per tweet runs every 24 hours. The frequency depends on rate-limiting by Twitter.

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

- Three periodic jobs that set up the [Twitter collections](https://developer.twitter.com/en/docs/twitter-api/v1/tweets/curate-a-collection/overview/about_collections). This job also backfills the tweets for the collection using the [Twitter API](https://developer.twitter.com/en/docs/twitter-api/v1/tweets/search/api-reference/get-search-tweets). The job runs via GitHub Actions actions every hour.

The configuration of what collections to create and what search terms to use are managed in a no-code way in [Notion](https://developers.notion.com/docs/getting-started).

If you have any questions about the implementation please reach out to [mertcelebi](https://github.com/mertcelebi).

## Getting started

> This repository uses Airtable as the database. The scripts expect that the `AIRTABLE_TABLE_ID` environment variable points to an Airtable table with the following schema:
> 
> **Name**: str, the text that appears at the top of the embeddable collection
> 
> **Description**: str, the name of the pub. Does not support rich text
> 
> **Search**: str, the Twitter search. This consists of the PubPub url and the DOI url, separated by a comma
> 
> **URL**: str, the URL of the [publishing-tools](https://github.com/Arcadia-Science/publishing-tools) collection that will be embedded.
> 
> **Tweets**: long text, a comma-separated list of tweet IDs
> 
> **ID**: str, a collection ID automatically generated by the `create_collections.py` script. Note that this is distinct from Airtable's internal record ID.
> 
> **CREATED_DATE**: str (ISO 8601 formatted date), the date the collection was created

### Create the environment file

Copy the `.env.copy` file to `.env` and fill in the relevant environment variables.

You can get a Twitter bearer token through the [Twitter developer dashboard](https://developer.twitter.com/en/portal/dashboard). Note, this repo uses Twitter API v2.

To get the Airtable environment variables, use the [web API documentation](https://airtable.com/developers/web/api/introduction). Select your base, and navigate to the table where your Twitter collections are stored to gather the table IDs and field IDs.

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

Once the installation is complete, you can run:

- The collection creation job with `python src/create_collections.py`.
- The tweet fetching job with `python src/fetch_tweets.py`.
- The quote tweet fetching job with `python src/fetch_quote_tweets.py`.

## Using Airtable as the database
The publishing team uses Airtable to store metadata about pubs and orchestrate the publishing process. Airtable is also used as the source of truth for PubPub Platform. As such, we use Airtable to house the links for standardized embeddable iframes for pubs, such as the Typeform feedback form that appears on all pubs and the Twitter collection that this repository generates and maintains.

We used [pyAirtable](https://pyairtable.readthedocs.io/en/stable/getting-started.html) for simplicity.

If you care for the Twitter API module used as part of this repository check out [here](https://github.com/Arcadia-Science/arcadia-twitter-collections/blob/main/src/twitter.ts).

## Using Twitter v1.1 and v2 endpoints

Twitter unfortunately removed the [collections functionality](https://developer.twitter.com/en/docs/twitter-api/v1/tweets/curate-a-collection/overview/about_collections) in their API v2. So, if you need to use collections, you need access to API v1.1. For this you need "Elevated" API access on Twitter which requires a simple application. Our application took less than 24 hours to get approved.

You can use the search functionality present in API v1.1, but we decided to use API v2 for the search functionality since it's more robust and allows more flexibility (direct search vs. FilteredStreams).

First time a collection is created, this project uses the [v2 recent search endpoint](https://developer.twitter.com/en/docs/twitter-api/tweets/search/api-reference/get-tweets-search-recent) for backfilling relevant tweets and for each tweet fetches all [its quote tweets](https://developer.twitter.com/en/docs/twitter-api/tweets/quote-tweets/api-reference/get-tweets-id-quote_tweets). This is suboptimal and inelegant. Sadly, the recent search endpoint does not match quote tweets based on the search query.
