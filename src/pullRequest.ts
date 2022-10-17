/* eslint-disable no-await-in-loop */
/* eslint-disable no-param-reassign */
import {
  searchPullRequest,
  SearchPullRequestResult,
} from './graphql/queries/github';
import client from './lib/graphqlClient';

type PullRequestStatuses = {
  WITH_FAILED_COMMITS: number;
  WITH_ONLY_ACTIONS_CI: number;
  WITH_ONLY_EXTERNAL_CI: number;
  WITH_SUCCESS_COMMITS: number;
  WITHOUT_CI: number;
};
const SUCCESS_KEY = 'SUCCESS';
const GITHUB_ACTIONS_KEY = 'GitHub Actions';

export class PullRequest {
  private NUM_OF_PRS: number;

  private NUM_OF_MERGED_PR = 0;

  private NUM_OF_FAILED_PR = 0;

  private NUM_OF_MERGED_PR_STATUSES: PullRequestStatuses;

  private NUM_OF_CLOSED_PR_STATUSES: PullRequestStatuses;

  private NEXT_CURSOR: string | null = null;

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

  async proccessNextPullRequest(repository: string) {
    console.log('Fetching for ->', this.NEXT_CURSOR);
    const data = await client.request<SearchPullRequestResult>(
      searchPullRequest,
      {
        QUERY: `NOT docs is:pr is:closed repo:${repository} comments:>=1`,
        NUM_OF_PRS: this.NUM_OF_PRS,
        CURSOR: this.NEXT_CURSOR,
      },
    );

    // If end of query, set Null
    if (!data.search.edges.length) {
      this.NEXT_CURSOR = null;
      return;
    }

    data.search.edges.forEach(
      ({ cursor, node: { commits, merged } }, nodeIndex) => {
        // If is the last Item, set NEXT_CURSOR to the current reference
        if (nodeIndex + 1 === data.search.edges.length) {
          this.NEXT_CURSOR = cursor;
        }
        const [node] = commits.nodes;

        // If does not have any commit, ignore
        if (!node) return;

        if (merged) {
          this.NUM_OF_MERGED_PR += 1;
        } else {
          this.NUM_OF_FAILED_PR += 1;
        }

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
          // 1- Check if not using both CIs
          // 2 - Using External CI && Using Actions
          // 3 - Using External CI && Not Using Actions
          // 4 - Not Using External CI && Using Actions
          // 5 - Not Using External CI && Not Using Actions

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

        if (merged) {
          processPRStatuses(this.NUM_OF_MERGED_PR_STATUSES);
          return;
        }
        processPRStatuses(this.NUM_OF_CLOSED_PR_STATUSES);
      },
    );
  }

  async fetchPullRequest(repository: string) {
    do {
      await this.proccessNextPullRequest(repository);
    } while (this.NEXT_CURSOR);

    return {
      repository,
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
