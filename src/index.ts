/* eslint-disable no-restricted-syntax */
import { stringify } from 'csv-stringify';
import fs from 'node:fs';
import { resolve } from 'node:path';
import {
  fetchGitHubQuery,
  FetchGitHubQueryResult,
} from './graphql/queries/github';
import client from './lib/graphqlClient';

const NUM_OF_REPOS = 100;
const NUM_OF_PRS = 100;

async function fetchPullRequests(repoOwner: string, repoName: string) {
  console.log('Fetching Repo for: ', `${repoOwner}/${repoName}`);
  const data = await client.request<FetchGitHubQueryResult>(fetchGitHubQuery, {
    REPO_NAME: repoName,
    REPO_OWNER: repoOwner,
    NUM_OF_PRS,
  });

  const SUCCESS_KEY = 'SUCCESS';

  let numOfMerged = 0;
  let numOfFailures = 0;

  let mergedPRWithoutActions = 0;
  let closedPRWithoutActions = 0;

  let mergedPRWithSucceedCommits = 0;
  const mergedPRWithSucceedCommitsArray: number[] = [];

  let mergedPRWithFailedCommits = 0;
  const mergedPRWithFailedCommitsArray: number[] = [];

  let closedPRWithSucceedCommits = 0;
  const closedPRWithSucceedCommitsArray: number[] = [];

  let closedPRWithFailedCommits = 0;
  const closedPRWithFailedCommitsArray: number[] = [];

  data.repository.pullRequests.nodes.forEach((pullRequest) => {
    const isPrMerged = pullRequest.merged;

    if (isPrMerged) {
      numOfMerged += 1;
    } else {
      numOfFailures += 1;
    }

    pullRequest.commits.nodes.forEach(({ commit }) => {
      // Check if a PR has GitHub Actions (status == null)
      const hasExternalCIcommitSucceeded = commit.status?.state === SUCCESS_KEY;

      if (!commit.status && !commit.checkSuites.totalCount) {
        if (isPrMerged) {
          mergedPRWithoutActions += 1;
          return;
        }
        closedPRWithoutActions += 1;
        return;
      }

      const hasActionsSucceeded = commit.checkSuites.nodes.every(
        (checkSuite) => checkSuite.conclusion === SUCCESS_KEY,
      );

      const hasCommitSucceeded =
        hasExternalCIcommitSucceeded && hasActionsSucceeded;

      // Succeed Commits
      if (hasCommitSucceeded) {
        if (isPrMerged) {
          mergedPRWithSucceedCommits += 1;
          mergedPRWithSucceedCommitsArray.push(pullRequest.number);
          return;
        }
        closedPRWithSucceedCommits += 1;
        closedPRWithSucceedCommitsArray.push(pullRequest.number);
        return;
      }

      // Failed Commits
      if (isPrMerged) {
        mergedPRWithFailedCommits += 1;
        mergedPRWithFailedCommitsArray.push(pullRequest.number);
        return;
      }
      closedPRWithFailedCommits += 1;
      closedPRWithFailedCommitsArray.push(pullRequest.number);
    });
  });

  const dataStatus = {
    name: `${repoOwner}/${repoName}`,
    'Number of Merged PR': numOfMerged,
    'Number of Failed PR': numOfFailures,
    'Merged PR With Succeed Commits': mergedPRWithSucceedCommits,
    // 'Merged PR With Succeed Commits Array': `[${mergedPRWithSucceedCommitsArray}]`,
    'Merged PR With Failed Commits': mergedPRWithFailedCommits,
    'Closed PR With Succeed Commits': closedPRWithSucceedCommits,
    'Closed PR With Failed Commits': closedPRWithFailedCommits,
    'Merged PR W/O Actions': mergedPRWithoutActions,
    'Closed PR W/O Actions': closedPRWithoutActions,
  };

  return dataStatus;
}

async function* processRepositories() {
  // const { search } = await client.request<SearchRepositoriesResult>(
  //   searchRepositoriesQuery,
  //   {
  //     NUM_OF_REPOS,
  //   },
  // );

  const reposFileData = fs.readFileSync(
    resolve(__dirname, 'documents', 'repos.txt'),
    { encoding: 'utf8' },
  );

  const reposData = reposFileData.toString().split('\n');

  for (const repo of reposData) {
    yield repo;
  }

  // for (const node of search.nodes) {
  //   const nextPullRequest = {
  //     name: node.nameWithOwner,
  //     stars: node.stargazerCount,
  //   };
  //   yield nextPullRequest;
  // }
}

async function main(): Promise<void> {
  let repoCounter = 0;
  const writableStream = fs.createWriteStream(
    resolve(__dirname, 'documents/generated', 'generated.csv'),
  );
  const stringifier = stringify({ header: true });

  for await (const data of processRepositories()) {
    const [repoOwner, repoName] = data.split('/');
    // eslint-disable-next-line no-loop-func
    fetchPullRequests(repoOwner, repoName).then((response) => {
      repoCounter += 1;
      stringifier.write(response);

      if (repoCounter === NUM_OF_REPOS) {
        stringifier.pipe(writableStream, { end: true });
      }
    });
  }
}

main();
