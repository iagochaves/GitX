/* eslint-disable no-await-in-loop */
/* eslint-disable no-param-reassign */
import dayjs from 'dayjs';
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

type PullRequestLifeTimeStatuses = {
  WITH_BOTH_ACTIONS_EXTERNAL_CI: number;
  WITH_ONLY_PASSING_ACTIONS_CI: number;
  WITH_ONLY_PASSING_EXTERNAL_CI: number;
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

  private TOTAL_MERGED_PR_LIFE_TIME_STATUSES: PullRequestLifeTimeStatuses;

  private TOTAL_CLOSED_PR_LIFE_TIME_STATUSES: PullRequestLifeTimeStatuses;

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
    this.TOTAL_MERGED_PR_LIFE_TIME_STATUSES = {
      WITH_BOTH_ACTIONS_EXTERNAL_CI: 0,
      WITH_ONLY_PASSING_ACTIONS_CI: 0,
      WITH_ONLY_PASSING_EXTERNAL_CI: 0,
      WITHOUT_CI: 0,
    };
    this.TOTAL_CLOSED_PR_LIFE_TIME_STATUSES = {
      WITH_BOTH_ACTIONS_EXTERNAL_CI: 0,
      WITH_ONLY_PASSING_ACTIONS_CI: 0,
      WITH_ONLY_PASSING_EXTERNAL_CI: 0,
      WITHOUT_CI: 0,
    };
  }

  async proccessNextPullRequest(repository: string) {
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
      (
        { cursor, node: { commits, merged, closedAt, createdAt } },
        nodeIndex,
      ) => {
        // If is the last Item, set NEXT_CURSOR to the current reference
        if (nodeIndex + 1 === data.search.edges.length) {
          this.NEXT_CURSOR = cursor;
        }
        const [node] = commits.nodes;

        // If does not have any commit, ignore
        if (!node) {
          return;
        }
        if (merged) {
          this.NUM_OF_MERGED_PR += 1;
        } else {
          this.NUM_OF_FAILED_PR += 1;
        }

        const prLifetime = dayjs(closedAt).diff(createdAt, 'hour', true);

        const isUsingExternalCI = !!node.commit.status?.state;

        const filteredCheckSuites = node.commit.checkSuites.nodes.filter(
          ({ app }) => app?.name === GITHUB_ACTIONS_KEY,
        );

        const hasExternalCISucceeded =
          node.commit.status?.state === SUCCESS_KEY;

        const hasActionsSucceeded = filteredCheckSuites.every(
          ({ conclusion }) => conclusion === SUCCESS_KEY,
        );

        const processPRStatuses = (
          PrObject: PullRequestStatuses,
          PrLifetimeObject: PullRequestLifeTimeStatuses,
        ) => {
          // Checks Merged - Closed Statuses
          // 1- Check if not using both CIs
          // 2 - Using External CI && Using Actions
          // 3 - Using External CI && Not Using Actions
          // 4 - Not Using External CI && Using Actions
          // 5 - Not Using External CI && Not Using Actions

          if (!isUsingExternalCI && !filteredCheckSuites.length) {
            PrObject.WITHOUT_CI += 1;
            PrLifetimeObject.WITHOUT_CI += prLifetime;
          } else if (hasExternalCISucceeded && hasActionsSucceeded) {
            PrObject.WITH_SUCCESS_COMMITS += 1;
            PrLifetimeObject.WITH_BOTH_ACTIONS_EXTERNAL_CI += prLifetime;
          } else if (hasExternalCISucceeded && !hasActionsSucceeded) {
            PrObject.WITH_ONLY_EXTERNAL_CI += 1;
            PrLifetimeObject.WITH_ONLY_PASSING_EXTERNAL_CI += prLifetime;
          } else if (!hasExternalCISucceeded && hasActionsSucceeded) {
            PrObject.WITH_ONLY_ACTIONS_CI += 1;
            PrLifetimeObject.WITH_ONLY_PASSING_ACTIONS_CI += prLifetime;
          } else {
            PrObject.WITH_FAILED_COMMITS += 1;
            PrLifetimeObject.WITHOUT_CI += prLifetime;
          }
        };

        if (merged) {
          processPRStatuses(
            this.NUM_OF_MERGED_PR_STATUSES,
            this.TOTAL_MERGED_PR_LIFE_TIME_STATUSES,
          );
          return;
        }
        processPRStatuses(
          this.NUM_OF_CLOSED_PR_STATUSES,
          this.TOTAL_CLOSED_PR_LIFE_TIME_STATUSES,
        );
      },
    );
  }

  async fetchPullRequest(repository: string) {
    do {
      await this.proccessNextPullRequest(repository);
    } while (this.NEXT_CURSOR);

    const totalMergedPRHours =
      this.TOTAL_MERGED_PR_LIFE_TIME_STATUSES.WITHOUT_CI +
      this.TOTAL_MERGED_PR_LIFE_TIME_STATUSES.WITH_BOTH_ACTIONS_EXTERNAL_CI +
      this.TOTAL_MERGED_PR_LIFE_TIME_STATUSES.WITH_ONLY_PASSING_ACTIONS_CI +
      this.TOTAL_MERGED_PR_LIFE_TIME_STATUSES.WITH_ONLY_PASSING_EXTERNAL_CI;

    const totalClosedPRHours =
      this.TOTAL_CLOSED_PR_LIFE_TIME_STATUSES.WITHOUT_CI +
      this.TOTAL_CLOSED_PR_LIFE_TIME_STATUSES.WITH_BOTH_ACTIONS_EXTERNAL_CI +
      this.TOTAL_CLOSED_PR_LIFE_TIME_STATUSES.WITH_ONLY_PASSING_ACTIONS_CI +
      this.TOTAL_CLOSED_PR_LIFE_TIME_STATUSES.WITH_ONLY_PASSING_EXTERNAL_CI;

    const totalPR = this.NUM_OF_MERGED_PR + this.NUM_OF_FAILED_PR;

    const avgPRLifetime = (
      (totalMergedPRHours + totalClosedPRHours) /
      totalPR
    ).toFixed(1);

    const basicInfo = {
      repository,
      'Number of Merged PR': this.NUM_OF_MERGED_PR,
      'Number of Failed PR': this.NUM_OF_FAILED_PR,
      'Avg. PR Resolution Time (hours)': avgPRLifetime,
    };

    const mergedPRNum = {
      'Merged PR With Failed Commits using both':
        this.NUM_OF_MERGED_PR_STATUSES.WITH_FAILED_COMMITS,
      'Merged PR With Success Commits using both':
        this.NUM_OF_MERGED_PR_STATUSES.WITH_SUCCESS_COMMITS,
      'Merged PR With Only passing GitHub Actions':
        this.NUM_OF_MERGED_PR_STATUSES.WITH_ONLY_ACTIONS_CI,
      'Merged PR With Only passing External CIs':
        this.NUM_OF_MERGED_PR_STATUSES.WITH_ONLY_EXTERNAL_CI,
      'Merged PR With No CI': this.NUM_OF_MERGED_PR_STATUSES.WITHOUT_CI,
    };

    const closedPRNum = {
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

    const mergedPRLifecycle = {
      'Avg. PR Resolution Time for Merged PR passing Actions and External CI validation (hours)':
        (
          this.TOTAL_MERGED_PR_LIFE_TIME_STATUSES
            .WITH_BOTH_ACTIONS_EXTERNAL_CI /
          this.NUM_OF_MERGED_PR_STATUSES.WITH_SUCCESS_COMMITS
        ).toFixed(1),
      'Avg. PR Resolution Time for Merged PR passing only Actions validation (hours)':
        (
          this.TOTAL_MERGED_PR_LIFE_TIME_STATUSES.WITH_ONLY_PASSING_ACTIONS_CI /
          this.NUM_OF_MERGED_PR_STATUSES.WITH_ONLY_ACTIONS_CI
        ).toFixed(1),
      'Avg. PR Resolution Time for Merged PR passing only External CI validation (hours)':
        (
          this.TOTAL_MERGED_PR_LIFE_TIME_STATUSES
            .WITH_ONLY_PASSING_EXTERNAL_CI /
          this.NUM_OF_MERGED_PR_STATUSES.WITH_ONLY_EXTERNAL_CI
        ).toFixed(1),
      'Avg. PR Resolution Time for Merged PR without passing validation (hours)':
        (
          this.TOTAL_MERGED_PR_LIFE_TIME_STATUSES.WITHOUT_CI /
          this.NUM_OF_MERGED_PR_STATUSES.WITHOUT_CI
        ).toFixed(1),
    };

    const closedPRLifecycle = {
      'Avg. PR Resolution Time for Closed PR passing Actions and External CI validation (hours)':
        (
          this.TOTAL_CLOSED_PR_LIFE_TIME_STATUSES
            .WITH_BOTH_ACTIONS_EXTERNAL_CI /
          this.NUM_OF_CLOSED_PR_STATUSES.WITH_SUCCESS_COMMITS
        ).toFixed(1),
      'Avg. PR Resolution Time for Closed PR passing only Actions validation (hours)':
        (
          this.TOTAL_CLOSED_PR_LIFE_TIME_STATUSES.WITH_ONLY_PASSING_ACTIONS_CI /
          this.NUM_OF_CLOSED_PR_STATUSES.WITH_ONLY_ACTIONS_CI
        ).toFixed(1),
      'Avg. PR Resolution Time for Closed PR passing only External CI validation (hours)':
        (
          this.TOTAL_CLOSED_PR_LIFE_TIME_STATUSES
            .WITH_ONLY_PASSING_EXTERNAL_CI /
          this.NUM_OF_CLOSED_PR_STATUSES.WITH_ONLY_EXTERNAL_CI
        ).toFixed(1),
      'Avg. PR Resolution Time for Closed PR without passing validation (hours)':
        (
          this.TOTAL_CLOSED_PR_LIFE_TIME_STATUSES.WITHOUT_CI /
          this.NUM_OF_CLOSED_PR_STATUSES.WITHOUT_CI
        ).toFixed(1),
    };

    return {
      ...basicInfo,
      ...mergedPRNum,
      ...closedPRNum,
      ...mergedPRLifecycle,
      ...closedPRLifecycle,
    };
  }
}
