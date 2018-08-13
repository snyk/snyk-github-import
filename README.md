# Github Import

[![Known Vulnerabilities](https://snyk.io/test/github/snyk/snyk-github-import/badge.svg)](https://snyk.io/test/github/snyk/snyk-github-import)

Imports projects from Github repos since a given date.

> Note: This module is a proof of concept for how you can use the Snyk import API. We hope to roll the findings from this module into the Snyk website eventually, so consider this a work in progress.

## Prerequisites

To use this tool you must first set an environment variable `SNYK_TOKEN` with
your API key, as found at https://app.snyk.io/account.

## Installation

You can install this globally by running:

```bash
npm install -g @snyk/github-import
```

You can find usage instructions by running:

```bash
snyk-github-import --help
```

## Usage

To import all repos modified in the last day (since the beginning of the day, yesterday) you can run the following command:

```bash
snyk-github-import --orgId=<orgId> --integrationId=<integrationId> --githubToken=<githubToken> --githubUrl=<baseUrl>
```

If you wish to expand the number of days, you can specify with the `days` argument:

```bash
snyk-github-import --orgId=<orgId> --integrationId=<integrationId> --githubToken=<githubToken> --githubUrl=<baseUrl> --days=<number>
```

To import all repos modified since a specific dateTime (in the ISO 8601 format `YYYY-MM-DDThh:mm:ss.sssZ`) you can run the following command:

```bash
snyk-github-import --orgId=<orgId> --integrationId=<integrationId> --githubToken=<githubToken> --githubUrl=<baseUrl> --since=<dateTime>
```

We recommend setting up a cron job to run this script daily at most.

- You can retrieve your `orgId` from your org settings page on [Snyk](https://snyk.io) or via the [Snyk API](https://snyk.docs.apiary.io/#reference/organisations/the-snyk-organisation-for-a-request/list-all-the-organisations-a-user-belongs-to).
- The `integrationId` is available via the integration settings page.
- You can generate a token for access to the GitHub API from your [Personal access tokens](https://github.com/settings/tokens) page.
- The Github URL is only required for Github Server instances and is the base URL that your GitHub Server is available at.

## How this works

When you run `snyk-github-import`, it retrieves all repos that were modified since the date you specify (defaults to 1 day). It then calls the Snyk import API with those repos, which will attempt to import projects from the given repos. If any new target files are found in these repos, this will result in a new project being created.

Please note that this will trigger a retest of any projects that were already imported.
