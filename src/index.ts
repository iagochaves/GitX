import {
  FetchGitHubQuery,
  FetchGitHubQueryResult,
} from './graphql/queries/github';
import client from './util/graphqlClient';

const SUCCESS_KEY = 'SUCCESS';

const fetchPullRequests = async () => {
  const data = await client.request<FetchGitHubQueryResult>(FetchGitHubQuery, {
    REPO_NAME: 'aws-sdk-js-v3',
    REPO_OWNER: 'aws',
    NUMBER_OF_PRS: 10,
  });

  let numOfMerged = 0;
  let numOfFailures = 0;

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
      const hasExternalCIcommitSucceeded = commit.status.state === SUCCESS_KEY;

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

  console.log('-------------BEGIN STATUS-------------');
  console.log('Number of Merged PR: ', numOfMerged);
  console.log('Number of Failed PR: ', numOfFailures);
  console.log(
    'Merged PR With Succeed Commits: ',
    mergedPRWithSucceedCommits,
    '\t',
    mergedPRWithSucceedCommitsArray,
  );
  console.log(
    'Merged PR With Failed Commits: ',
    mergedPRWithFailedCommits,
    '\t',
    mergedPRWithFailedCommitsArray,
  );
  console.log(
    'Closed PR With Succeed Commits: ',
    closedPRWithSucceedCommits,
    '\t',
    closedPRWithSucceedCommitsArray,
  );
  console.log(
    'Closed PR With Failed Commits: ',
    closedPRWithFailedCommits,
    '\t',
    closedPRWithFailedCommitsArray,
  );
  console.log('-------------END STATUS-------------');
};

fetchPullRequests();
