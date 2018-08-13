#!/usr/bin/env node

const Enquirer = require('enquirer');
const args = require('minimist')(process.argv.slice(2));
const uuidValidate = require('uuid-validate');
const request = require('request-promise-native');
const chalk = require('chalk');
const moment = require('moment');
const Octokit = require('@octokit/rest');

const defaults = {
  apiBase: 'https://snyk.io/api/v1',
  githubUrl: 'https://api.github.com',
  days: 1,
}

const help = 'Usage: snyk-github-import --orgId=<orgId> --integrationId=<integrationId> --githubToken=<githubToken> \n' +
  'Optional arguments: \n' +
  `--githubUrl (e.g. "${defaults.githubUrl}")` +
  `--days (e.g. ${defaults.days})` +
  `--since (ISO 8601 format date)`;

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
  return process.exit(1);
}

const github = Octokit({ baseUrl: githubUrl });

github.authenticate({
  type: 'token',
  token: args.githubToken,
})

const enquirer = new Enquirer();
enquirer.register('confirm', require('prompt-confirm'));

async function getRepos (since) {
  let response = await github.repos.getAll({
    per_page: 100,
    sort: 'updated',
  });
  let {data} = response;

  while (github.hasNextPage(response) && since.isBefore(data[data.length - 1].updated_at)) {
    response = await github.getNextPage(response);
    data = data.concat(response.data)
  }

  const repos = data.filter(repo => since.isBefore(repo.updated_at));

  return repos;
}

async function importRepos () {
  let since;
  if (args.since) {
    since = moment(args.since);
  } else {
    since = moment().subtract(days, 'days').startOf('day');
  }

  console.log(chalk.grey(`Importing repos modified since ${since.format()}`));
  let repos;
  try {
    repos = await getRepos(since);
  } catch (err) {
    console.log(chalk.red(err));
    return process.exit(1);
  }

  if (repos.length === 0) {
    console.log(chalk.green('No repos to import'));
    return process.exit(0);
  }

  console.log(chalk.grey(`Found ${repos.length} repo${repos.length > 1 ? 's' : ''} to import`));

  const results = await Promise.all(repos.map(async repo => {
    const target = {
      owner: repo.owner.login,
      name: repo.name,
      branch: repo.default_branch,
    };

    const {headers} = await request({
      method: 'post',
      url: `${apiBase}/org/${args.orgId}/integrations/${args.integrationId}/import`,
      headers: {
        authorization: `token ${apiKey}`,
      },
      json: true,
      resolveWithFullResponse: true,
      body: { target },
    });

    console.log(chalk.green(`Importing from ${target.owner}/${target.name}:${target.branch} (${headers.location})`));
  }));

  process.exit(0);
}

importRepos()
.catch(err => {
  console.error(err.stack);
  process.exit(1);
})
