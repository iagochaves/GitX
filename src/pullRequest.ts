/* eslint-disable class-methods-use-this */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-param-reassign */
import dayjs from 'dayjs';
import { PullRequestsNode } from './graphql/queries/github';

export type PullRequestData = {
  closedAt: string;
  createdAt: string;
  id: number;
  isCommitSuccessfull: string;
  isMerged: string;
  isUsingActions: string;
  isUsingExternalCI: string;
  resolveTimeInHours: number;
};
const SUCCESS_KEY = 'SUCCESS';
const GITHUB_ACTIONS_KEY = 'GitHub Actions';

export class PullRequest {
  private closedAt: string;

  private createdAt: string;

  private id: number;

  private isCommitSuccessfull: string;

  private isMerged: string;

  private isUsingActions: string;

  private isUsingExternalCI: string;

  private resolveTimeInHours: number;

  constructor() {
    this.closedAt = '';
    this.createdAt = '';
    this.id = 0;
    this.isCommitSuccessfull = '';
    this.isMerged = '';
    this.isUsingActions = '';
    this.isUsingExternalCI = '';
    this.resolveTimeInHours = 0;
  }

  getData(): PullRequestData {
    return {
      id: this.id,
      isMerged: this.isMerged,
      createdAt: this.createdAt,
      closedAt: this.closedAt,
      resolveTimeInHours: this.resolveTimeInHours,
      isUsingActions: this.isUsingActions,
      isUsingExternalCI: this.isUsingExternalCI,
      isCommitSuccessfull: this.isCommitSuccessfull,
    };
  }

  isValid(
    title: string,
    commitsTotalCount: number,
    commentsTotalCount: number,
  ) {
    // FILTER PR
    // 1 - Check if there is at least 1 commit in the PR
    // 2 - Check if PR is not about docs (README etc)
    // 3 - Check if PR has at least 1 comment

    const hasDocsWord = ['docs', 'readme', 'documentation'].some((word) =>
      title.includes(word),
    );

    return !hasDocsWord && commitsTotalCount && commentsTotalCount;
  }

  proccessNext(data: PullRequestsNode) {
    const { closedAt, commits, createdAt, merged, number } = data;
    const [{ commit }] = commits.nodes;

    const prLifetime = dayjs(closedAt).diff(createdAt, 'hour', true);

    const isUsingExternalCI = !!commit.status?.state;

    const hasExternalCISucceeded = commit.status?.state === SUCCESS_KEY;

    const filteredCheckSuites = commit.checkSuites.nodes.filter(
      ({ app }) => app?.name === GITHUB_ACTIONS_KEY,
    );

    const hasActionsSucceeded = filteredCheckSuites.every(
      ({ conclusion }) => conclusion === SUCCESS_KEY,
    );

    const getCommitStatus = () => {
      if (isUsingExternalCI && filteredCheckSuites.length > 0)
        return hasExternalCISucceeded && hasActionsSucceeded;

      return (
        (isUsingExternalCI || filteredCheckSuites.length > 0) &&
        (hasExternalCISucceeded || hasActionsSucceeded)
      );
    };
    const formatDate = (date: string) => dayjs(date).format('DD/MM/YYYY HH:mm');

    this.closedAt = formatDate(closedAt);
    this.createdAt = formatDate(createdAt);
    this.id = number;
    this.isCommitSuccessfull = String(getCommitStatus());
    this.isMerged = String(merged);
    this.isUsingActions = String(filteredCheckSuites.length > 0);
    this.isUsingExternalCI = String(isUsingExternalCI);
    this.resolveTimeInHours = Number(prLifetime.toFixed(1));
    return this.getData();
  }
}
