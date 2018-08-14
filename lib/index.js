const request = require('request-promise-native');
const Github = require('@octokit/rest');

module.exports = {
  getRepos,
  importRepos,
};

async function getRepos(githubUrl, githubToken, since, githubOrg) {
  const github = Github({ baseUrl: githubUrl });

  github.authenticate({
    type: 'token',
    token: githubToken,
  });

  let response = await github.repos.getAll({
    per_page: 100, // eslint-disable-line
    sort: 'updated',
  });
  let { data } = response;

  while (github.hasNextPage(response) && since.isBefore(data[data.length - 1].updated_at)) {
    response = await github.getNextPage(response);
    data = data.concat(response.data);
  }

  const repos = data.filter(repo => {
    if (githubOrg && repo.owner.login !== githubOrg) {
      return false;
    }
    return since.isBefore(repo.updated_at);
  });

  return repos;
}

async function importRepos(repos, apiBase, apiKey, { orgId, integrationId }) {
  const results = await Promise.all(repos.map(async repo => {
    const target = {
      owner: repo.owner.login,
      name: repo.name,
      branch: repo.default_branch,
    };

    const { headers } = await request({
      method: 'post',
      url: `${apiBase}/org/${orgId}/integrations/${integrationId}/import`,
      headers: {
        authorization: `token ${apiKey}`,
      },
      json: true,
      resolveWithFullResponse: true,
      body: { target },
    });

    return {
      target,
      location: headers.location,
    };
  }));

  return results;
}
