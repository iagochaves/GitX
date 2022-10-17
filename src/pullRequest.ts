/* eslint-disable no-param-reassign */
import {
  fetchGitHubQuery,
  FetchGitHubQueryResult,
} from './graphql/queries/github';
import client from './lib/graphqlClient';

// export interface PullRequestData {
//   name: string;
//   'Number of Merged PR': number;
//   'Number of Failed PR': number;
//   'Merged PR With Succeed Commits': number;
//   'Merged PR With Failed Commits': number;
//   'Closed PR With Succeed Commits': number;
//   'Closed PR With Failed Commits': number;
//   'Merged PR W/O Actions': number;
//   'Closed PR W/O Actions': number;
// }

type PullRequestStatuses = {
  WITH_FAILED_COMMITS: number;
  WITH_ONLY_ACTIONS_CI: number;
  WITH_ONLY_EXTERNAL_CI: number;
  WITH_SUCCESS_COMMITS: number;
  WITHOUT_CI: number;
};

export class PullRequest {
  private NUM_OF_PRS: number;

  private NUM_OF_MERGED_PR = 0;

  private NUM_OF_FAILED_PR = 0;

  private NUM_OF_MERGED_PR_STATUSES: PullRequestStatuses;

  private NUM_OF_CLOSED_PR_STATUSES: PullRequestStatuses;

  constructor(numOfPrs: number) {
    this.NUM_OF_PRS = numOfPrs;

    this.NUM_OF_MERGED_PR_STATUSES = {
      WITH_FAILED_COMMITS: 0,
      WITH_ONLY_ACTIONS_CI: 0,
      WITH_ONLY_EXTERNAL_CI: 0,
      WITH_SUCCESS_COMMITS: 0,
      WITHOUT_CI: 0,
    };
    this.NUM_OF_CLOSED_PR_STATUSES = {
      WITH_FAILED_COMMITS: 0,
      WITH_ONLY_ACTIONS_CI: 0,
      WITH_ONLY_EXTERNAL_CI: 0,
      WITH_SUCCESS_COMMITS: 0,
      WITHOUT_CI: 0,
    };
  }

  async fetchPullRequest(repoOwner: string, repoName: string) {
    console.log(`Proccessing -> ${repoOwner}/${repoName}`);
    const data = await client.request<FetchGitHubQueryResult>(
      fetchGitHubQuery,
      {
        REPO_NAME: repoName,
        REPO_OWNER: repoOwner,
        NUM_OF_PRS: this.NUM_OF_PRS,
      },
    );

    const SUCCESS_KEY = 'SUCCESS';
    const GITHUB_ACTIONS_KEY = 'GitHub Actions';
    data.repository.pullRequests.nodes.forEach((pullRequest) => {
      const isPrMerged = pullRequest.merged;

      if (isPrMerged) {
        this.NUM_OF_MERGED_PR += 1;
      } else {
        this.NUM_OF_FAILED_PR += 1;
      }

      const [node] = pullRequest.commits.nodes;

      if (node?.commit) {
        const isUsingExternalCI = !!node.commit.status?.state;

        const filteredCheckSuites = node.commit.checkSuites.nodes.filter(
          ({ app }) => app?.name === GITHUB_ACTIONS_KEY,
        );

        const hasExternalCISucceeded =
          node.commit.status?.state === SUCCESS_KEY;

        const hasActionsSucceeded = filteredCheckSuites.every(
          ({ conclusion }) => conclusion === SUCCESS_KEY,
        );

        const processPRStatuses = (PrObject: PullRequestStatuses) => {
          // Checks Merged - Closed Statuses
          // Check if not using both CIs
          // 1 - Using External CI && Using Actions
          // 2 - Using External CI && Not Using Actions
          // 3 - Not Using External CI && Using Actions
          // 4 - Not Using External CI && Not Using Actions

          if (!isUsingExternalCI && !filteredCheckSuites.length) {
            PrObject.WITHOUT_CI += 1;
          } else if (hasExternalCISucceeded && hasActionsSucceeded) {
            PrObject.WITH_SUCCESS_COMMITS += 1;
          } else if (hasExternalCISucceeded && !hasActionsSucceeded) {
            PrObject.WITH_ONLY_EXTERNAL_CI += 1;
          } else if (!hasExternalCISucceeded && hasActionsSucceeded) {
            PrObject.WITH_ONLY_ACTIONS_CI += 1;
          } else {
            PrObject.WITH_FAILED_COMMITS += 1;
          }
        };

        if (isPrMerged) {
          processPRStatuses(this.NUM_OF_MERGED_PR_STATUSES);
          return;
        }

        processPRStatuses(this.NUM_OF_CLOSED_PR_STATUSES);
      }
    });

    return {
      name: `${repoOwner}/${repoName}`,
      'Number of Merged PR': this.NUM_OF_MERGED_PR,
      'Number of Failed PR': this.NUM_OF_FAILED_PR,

      'Merged PR With Failed Commits using both':
        this.NUM_OF_MERGED_PR_STATUSES.WITH_FAILED_COMMITS,
      'Merged PR With Success Commits using both':
        this.NUM_OF_MERGED_PR_STATUSES.WITH_SUCCESS_COMMITS,
      'Merged PR With Only passing GitHub Actions':
        this.NUM_OF_MERGED_PR_STATUSES.WITH_ONLY_ACTIONS_CI,
      'Merged PR With Only passing External CIs':
        this.NUM_OF_MERGED_PR_STATUSES.WITH_ONLY_EXTERNAL_CI,
      'Merged PR With No CI': this.NUM_OF_MERGED_PR_STATUSES.WITHOUT_CI,

      'Closed PR With Failed Commits using both':
        this.NUM_OF_CLOSED_PR_STATUSES.WITH_FAILED_COMMITS,
      'Closed PR With Success Commits using both':
        this.NUM_OF_CLOSED_PR_STATUSES.WITH_SUCCESS_COMMITS,
      'Closed PR With Only passing GitHub Actions':
        this.NUM_OF_CLOSED_PR_STATUSES.WITH_ONLY_ACTIONS_CI,
      'Closed PR With Only passing External CIs':
        this.NUM_OF_CLOSED_PR_STATUSES.WITH_ONLY_EXTERNAL_CI,
      'Closed PR With No CI': this.NUM_OF_CLOSED_PR_STATUSES.WITHOUT_CI,
    };
  }
}
