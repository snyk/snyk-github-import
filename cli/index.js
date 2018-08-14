#!/usr/bin/env node

const args = require('minimist')(process.argv.slice(2));
const uuidValidate = require('uuid-validate');
const chalk = require('chalk');
const githubImport = require('../lib');
const moment = require('moment');

const defaults = {
  apiBase: 'https://snyk.io/api/v1',
  githubUrl: 'https://api.github.com',
  days: 1,
};

const help = `
Usage: snyk-github-import --orgId=<orgId> --integrationId=<integrationId> --githubToken=<githubToken>

Optional arguments:
  --githubUrl (e.g. "${defaults.githubUrl}")
  --days (e.g. ${defaults.days})
  --since (ISO 8601 format date)
`;

if (args.help || args.h) {
  console.log(help);
  return process.exit(0);
}

const apiKey = process.env.SNYK_TOKEN;
const apiBase = args.apiBase || defaults.apiBase;
const githubUrl = args.githubUrl || defaults.githubUrl;
const days = parseInt(args.days || defaults.days);

const validators = {
  orgId: uuidValidate,
  integrationId: uuidValidate,
  githubToken: token => !!token,
  days: () => !isNaN(days),
};

const invalidArgs = Object.keys(validators).filter(key =>
  !validators[key](args[key])
);

if (invalidArgs.length > 0) {
  console.log(chalk.red(`Invalid args passed: ${invalidArgs.join(', ')}`));
  console.log(help);
  process.exit(1);
}

async function init() {
  let since;
  if (args.since) {
    since = moment(args.since);
  } else {
    since = moment().subtract(args.days, 'days').startOf('day');
  }

  console.log(chalk.grey(`Importing repos modified since ${since.format()}`));

  const repos = await githubImport.getRepos(githubUrl, args.githubToken, since);

  if (!repos) {
    console.log(chalk.green('No repos to import'));
    process.exit(0);
  }

  console.log(chalk.grey(`Found ${repos.length} repo${repos.length > 1 ? 's' : ''} to import`));

  const results = await githubImport.importRepos(repos, apiBase, apiKey, args);
  results.map(({ target, location }) => {
    console.log(chalk.green(`Importing from ${target.owner}/${target.name}:${target.branch} (${location})`));
  });
}

init()
  .catch(err => {
    console.log(chalk.red(err));
    process.exit(1);
  });
