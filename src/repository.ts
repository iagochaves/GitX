/* eslint-disable no-lonely-if */
/* eslint-disable no-param-reassign */
/* eslint-disable class-methods-use-this */
/* eslint-disable no-await-in-loop */

import fs from 'node:fs';
import {
  fetchPullRequestQuery,
  FetchPullRequestQueryResult,
} from './graphql/queries/github';
import client from './lib/graphqlClient';
import { PullRequest, PullRequestData } from './pullRequest';
import { WritableStream } from './services/writableStream';
import { formatObjectData } from './utils/formatObjectData';

type PullRequestStatuses = {
  WITH_FAILED_COMMITS: number;
  WITH_ONLY_VALIDATED_ACTIONS_CI: number;
  WITH_ONLY_FAILED_ACTIONS_CI: number;
  WITH_ONLY_VALIDATED_EXTERNAL_CI: number;
  WITH_ONLY_FAILED_EXTERNAL_CI: number;
  WITH_SUCCESS_COMMITS: number;
  WITHOUT_CI: number;
};

type PullRequestLifeTimeStatuses = {
  WITH_BOTH_ACTIONS_EXTERNAL_CI: number;
  WITH_ONLY_PASSING_ACTIONS_CI: number;
  WITH_ONLY_PASSING_EXTERNAL_CI: number;
  WITHOUT_CI: number;
};

export class Repository {
  private REPO_NAME: string;

  private NUM_OF_PRS = 0;

  private NUM_OF_MERGED_PR = 0;

  private NUM_OF_CLOSED_PR = 0;

  private NUM_OF_MERGED_PR_STATUSES: PullRequestStatuses;

  private NUM_OF_CLOSED_PR_STATUSES: PullRequestStatuses;

  private TOTAL_MERGED_PR_LIFE_TIME_STATUSES: PullRequestLifeTimeStatuses;

  private TOTAL_CLOSED_PR_LIFE_TIME_STATUSES: PullRequestLifeTimeStatuses;

  private writableStream: WritableStream;

  private actionsStream: fs.WriteStream;

  private externalCiStream: fs.WriteStream;

  private noCiStream: fs.WriteStream;

  constructor(
    repositoryName: string,
    actionsStream: fs.WriteStream,
    externalCiStream: fs.WriteStream,
    noCiStream: fs.WriteStream,
  ) {
    this.actionsStream = actionsStream;
    this.externalCiStream = externalCiStream;
    this.noCiStream = noCiStream;
    this.REPO_NAME = repositoryName;
    const [repoOwner, repoName] = this.REPO_NAME.split('/');
    this.writableStream = new WritableStream(`repos/${repoOwner}-${repoName}`);

    this.NUM_OF_MERGED_PR_STATUSES = {
      WITH_FAILED_COMMITS: 0,
      WITH_ONLY_VALIDATED_ACTIONS_CI: 0,
      WITH_ONLY_FAILED_ACTIONS_CI: 0,
      WITH_ONLY_VALIDATED_EXTERNAL_CI: 0,
      WITH_ONLY_FAILED_EXTERNAL_CI: 0,
      WITH_SUCCESS_COMMITS: 0,
      WITHOUT_CI: 0,
    };
    this.NUM_OF_CLOSED_PR_STATUSES = {
      WITH_FAILED_COMMITS: 0,
      WITH_ONLY_VALIDATED_ACTIONS_CI: 0,
      WITH_ONLY_FAILED_ACTIONS_CI: 0,
      WITH_ONLY_VALIDATED_EXTERNAL_CI: 0,
      WITH_ONLY_FAILED_EXTERNAL_CI: 0,
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

  getData() {
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

    const totalPR = this.NUM_OF_MERGED_PR + this.NUM_OF_CLOSED_PR;

    const avgPRLifetime = (
      (totalMergedPRHours + totalClosedPRHours) /
      totalPR
    ).toFixed(1);

    const basicInfo = {
      repository: this.REPO_NAME,
      'Total PR analyzed': this.NUM_OF_PRS,
      'Number of Merged PR': this.NUM_OF_MERGED_PR,
      'Number of Closed PR': this.NUM_OF_CLOSED_PR,
      'Avg. PR Resolution Time (hours)': avgPRLifetime,
    };

    const mergedPRNum = {
      'Accepted PR With Failed Commits using both':
        this.NUM_OF_MERGED_PR_STATUSES.WITH_FAILED_COMMITS,
      'Accepted PR With Success Commits using both':
        this.NUM_OF_MERGED_PR_STATUSES.WITH_SUCCESS_COMMITS,
      'Accepted PR With Only passing successfull GitHub Actions':
        this.NUM_OF_MERGED_PR_STATUSES.WITH_ONLY_VALIDATED_ACTIONS_CI,
      'Accepted PR With Only passing failed GitHub Actions':
        this.NUM_OF_MERGED_PR_STATUSES.WITH_ONLY_FAILED_ACTIONS_CI,
      'Accepted PR With Only passing successfull External CIs':
        this.NUM_OF_MERGED_PR_STATUSES.WITH_ONLY_VALIDATED_EXTERNAL_CI,
      'Accepted PR With Only passing failed External CIs':
        this.NUM_OF_MERGED_PR_STATUSES.WITH_ONLY_FAILED_EXTERNAL_CI,
      'Accepted PR With No CI': this.NUM_OF_MERGED_PR_STATUSES.WITHOUT_CI,
    };

    const closedPRNum = {
      'Not Accepted PR With Failed Commits using both':
        this.NUM_OF_CLOSED_PR_STATUSES.WITH_FAILED_COMMITS,
      'Not Accepted PR With Success Commits using both':
        this.NUM_OF_CLOSED_PR_STATUSES.WITH_SUCCESS_COMMITS,
      'Not Accepted PR With Only passing successfull GitHub Actions':
        this.NUM_OF_CLOSED_PR_STATUSES.WITH_ONLY_VALIDATED_ACTIONS_CI,
      'Not Accepted PR With Only passing failed GitHub Actions':
        this.NUM_OF_CLOSED_PR_STATUSES.WITH_ONLY_FAILED_ACTIONS_CI,
      'Not Accepted PR With Only passing successfull External CIs':
        this.NUM_OF_CLOSED_PR_STATUSES.WITH_ONLY_VALIDATED_EXTERNAL_CI,
      'Not Accepted PR With Only passing failed External CIs':
        this.NUM_OF_CLOSED_PR_STATUSES.WITH_ONLY_FAILED_EXTERNAL_CI,
      'Not Accepted PR With No CI': this.NUM_OF_CLOSED_PR_STATUSES.WITHOUT_CI,
    };

    const mergedPRLifecycle = {
      'Avg. PR Resolution Time for Accepted PR passing Actions and External CI validation (hours)':
        (
          this.TOTAL_MERGED_PR_LIFE_TIME_STATUSES
            .WITH_BOTH_ACTIONS_EXTERNAL_CI /
          this.NUM_OF_MERGED_PR_STATUSES.WITH_SUCCESS_COMMITS
        ).toFixed(1),
      'Avg. PR Resolution Time for Accepted PR passing only Actions validation (hours)':
        (
          this.TOTAL_MERGED_PR_LIFE_TIME_STATUSES.WITH_ONLY_PASSING_ACTIONS_CI /
          this.NUM_OF_MERGED_PR_STATUSES.WITH_ONLY_VALIDATED_ACTIONS_CI
        ).toFixed(1),
      'Avg. PR Resolution Time for Accepted PR passing only External CI validation (hours)':
        (
          this.TOTAL_MERGED_PR_LIFE_TIME_STATUSES
            .WITH_ONLY_PASSING_EXTERNAL_CI /
          this.NUM_OF_MERGED_PR_STATUSES.WITH_ONLY_VALIDATED_EXTERNAL_CI
        ).toFixed(1),
      'Avg. PR Resolution Time for Accepted PR without passing validation (hours)':
        (
          this.TOTAL_MERGED_PR_LIFE_TIME_STATUSES.WITHOUT_CI /
          this.NUM_OF_MERGED_PR_STATUSES.WITHOUT_CI
        ).toFixed(1),
    };

    const closedPRLifecycle = {
      'Avg. PR Resolution Time for Not Accepted PR passing Actions and External CI validation (hours)':
        (
          this.TOTAL_CLOSED_PR_LIFE_TIME_STATUSES
            .WITH_BOTH_ACTIONS_EXTERNAL_CI /
          this.NUM_OF_CLOSED_PR_STATUSES.WITH_SUCCESS_COMMITS
        ).toFixed(1),
      'Avg. PR Resolution Time for Not Accepted PR passing only Actions validation (hours)':
        (
          this.TOTAL_CLOSED_PR_LIFE_TIME_STATUSES.WITH_ONLY_PASSING_ACTIONS_CI /
          this.NUM_OF_CLOSED_PR_STATUSES.WITH_ONLY_VALIDATED_ACTIONS_CI
        ).toFixed(1),
      'Avg. PR Resolution Time for Not Accepted PR passing only External CI validation (hours)':
        (
          this.TOTAL_CLOSED_PR_LIFE_TIME_STATUSES
            .WITH_ONLY_PASSING_EXTERNAL_CI /
          this.NUM_OF_CLOSED_PR_STATUSES.WITH_ONLY_VALIDATED_EXTERNAL_CI
        ).toFixed(1),
      'Avg. PR Resolution Time for Not Accepted PR without passing validation (hours)':
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

  add(data: PullRequestData) {
    const {
      isCommitSuccessfull,
      isMerged,
      isUsingActions,
      isUsingExternalCI,
      resolveTimeInHours,
    } = data;
    this.NUM_OF_PRS += 1;

    if (isMerged) {
      this.NUM_OF_MERGED_PR += 1;
    } else {
      this.NUM_OF_CLOSED_PR += 1;
    }

    const processPRStatuses = (
      PrObject: PullRequestStatuses,
      PrLifetimeObject: PullRequestLifeTimeStatuses,
    ) => {
      // Checks Merged - Closed Statuses
      // 1 - Check if not using both CIs
      // 2 - Passed External CI && Passed Actions
      // 3 - Passed External CI && Not Passed Actions
      // 4 - Not Passed External CI && Using Actions
      // 5 - Failed External CI && Failed Actions

      if (!isUsingExternalCI && !isUsingActions) {
        PrObject.WITHOUT_CI += 1;
        PrLifetimeObject.WITHOUT_CI += resolveTimeInHours;
      } else if (isUsingExternalCI && isUsingActions) {
        if (isCommitSuccessfull) PrObject.WITH_SUCCESS_COMMITS += 1;
        else PrObject.WITH_FAILED_COMMITS += 1;

        PrLifetimeObject.WITH_BOTH_ACTIONS_EXTERNAL_CI += resolveTimeInHours;
      } else if (isUsingExternalCI && !isUsingActions) {
        // Only Using External CI
        if (isCommitSuccessfull) PrObject.WITH_ONLY_VALIDATED_EXTERNAL_CI += 1;
        else PrObject.WITH_ONLY_FAILED_EXTERNAL_CI += 1;
        PrLifetimeObject.WITH_ONLY_PASSING_EXTERNAL_CI += resolveTimeInHours;
      } else {
        // Only Using Actions CI
        if (isCommitSuccessfull) PrObject.WITH_ONLY_VALIDATED_ACTIONS_CI += 1;
        else PrObject.WITH_ONLY_FAILED_ACTIONS_CI += 1;
        PrLifetimeObject.WITH_ONLY_PASSING_ACTIONS_CI += resolveTimeInHours;
      }
    };

    if (isMerged) {
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
  }

  async readPullRequests() {
    const [repoOwner, repoName] = this.REPO_NAME.split('/');
    let nextCursor: string | undefined;
    const MAX_NUM_PR_PER_REQUEST = 50;

    const fetchPullRequest = async () => {
      const response = await client.request<FetchPullRequestQueryResult>(
        fetchPullRequestQuery,
        {
          NUM_OF_PRS: MAX_NUM_PR_PER_REQUEST,
          REPO_NAME: repoName,
          REPO_OWNER: repoOwner,
          CURSOR: nextCursor,
        },
      );
      return response;
    };

    do {
      const response = await fetchPullRequest();
      console.log(
        'Current PR -> ',
        this.NUM_OF_PRS,
        ' For -> ',
        `${repoOwner}/${repoName}`,
      );
      const { endCursor, hasNextPage } =
        response.repository.pullRequests.pageInfo;

      nextCursor = endCursor;

      const pullRequestsData = response.repository.pullRequests.nodes;

      pullRequestsData.forEach((pullRequest) => {
        const {
          title,
          comments,
          commits: { nodes },
        } = pullRequest;
        const pr = new PullRequest();

        if (
          pr.isValid(title.toLowerCase(), nodes.length, comments.totalCount)
        ) {
          const data = pr.proccessNext(pullRequest);
          this.add(data);

          // Only Actions
          if (data.isUsingActions && !data.isUsingExternalCI) {
            this.actionsStream.write(`${data.resolveTimeInHours}\n`);
          }
          // Only Using External CI
          else if (!data.isUsingActions && data.isUsingExternalCI) {
            this.externalCiStream.write(`${data.resolveTimeInHours}\n`);
          }
          // No CI
          else if (!data.isUsingActions && !data.isUsingExternalCI) {
            this.noCiStream.write(`${data.resolveTimeInHours}\n`);
          }

          const dataForCSV = formatObjectData(pr.getCSVFields());
          this.writableStream.write(dataForCSV);
        }
      });

      if (!hasNextPage) {
        nextCursor = undefined;
      }
    } while (nextCursor);

    this.writableStream.pipe();
  }
}
