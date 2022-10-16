import {
  fetchGitHubQuery,
  FetchGitHubQueryResult,
} from './graphql/queries/github';
import client from './lib/graphqlClient';

export interface PullRequestData {
  name: string;
  'Number of Merged PR': number;
  'Number of Failed PR': number;
  'Merged PR With Succeed Commits': number;
  'Merged PR With Failed Commits': number;
  'Closed PR With Succeed Commits': number;
  'Closed PR With Failed Commits': number;
  'Merged PR W/O Actions': number;
  'Closed PR W/O Actions': number;
}

export class PullRequest {
  private NUM_OF_PRS: number;

  private NUM_OF_MERGED_PR = 0;

  private NUM_OF_FAILED_PR = 0;

  private NUM_OF_MERGED_PR_WITHOUT_ACTIONS = 0;

  private NUM_OF_CLOSED_PR_WITHOUT_ACTIONS = 0;

  private NUM_OF_MERGED_PR_WITH_SUCCESS_COMMITS = 0;

  private NUM_OF_MERGED_PR_WITH_FAILED_COMMITS = 0;

  private NUM_OF_CLOSED_PR_WITH_SUCCESS_COMMITS = 0;

  private NUM_OF_CLOSED_PR_WITH_FAILED_COMMITS = 0;

  constructor(numOfPrs: number) {
    this.NUM_OF_PRS = numOfPrs;
  }

  async fetchPullRequest(
    repoOwner: string,
    repoName: string,
  ): Promise<PullRequestData> {
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

    data.repository.pullRequests.nodes.forEach((pullRequest) => {
      const isPrMerged = pullRequest.merged;

      if (isPrMerged) {
        this.NUM_OF_MERGED_PR += 1;
      } else {
        this.NUM_OF_FAILED_PR += 1;
      }

      pullRequest.commits.nodes.forEach(({ commit }) => {
        // Check if a PR has GitHub Actions (status == null)
        const hasExternalCIcommitSucceeded =
          commit.status?.state === SUCCESS_KEY;

        if (!commit.status && !commit.checkSuites.totalCount) {
          if (isPrMerged) {
            this.NUM_OF_MERGED_PR_WITHOUT_ACTIONS += 1;
            return;
          }
          this.NUM_OF_CLOSED_PR_WITHOUT_ACTIONS += 1;
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
            this.NUM_OF_MERGED_PR_WITH_SUCCESS_COMMITS += 1;
            return;
          }
          this.NUM_OF_CLOSED_PR_WITH_SUCCESS_COMMITS += 1;
          return;
        }

        // Failed Commits
        if (isPrMerged) {
          this.NUM_OF_MERGED_PR_WITH_FAILED_COMMITS += 1;
          return;
        }
        this.NUM_OF_CLOSED_PR_WITH_FAILED_COMMITS += 1;
      });
    });

    return {
      name: `${repoOwner}/${repoName}`,
      'Number of Merged PR': this.NUM_OF_MERGED_PR,
      'Number of Failed PR': this.NUM_OF_FAILED_PR,
      'Merged PR With Succeed Commits':
        this.NUM_OF_MERGED_PR_WITH_SUCCESS_COMMITS,
      'Merged PR With Failed Commits':
        this.NUM_OF_MERGED_PR_WITH_FAILED_COMMITS,
      'Closed PR With Succeed Commits':
        this.NUM_OF_CLOSED_PR_WITH_SUCCESS_COMMITS,
      'Closed PR With Failed Commits':
        this.NUM_OF_CLOSED_PR_WITH_FAILED_COMMITS,
      'Merged PR W/O Actions': this.NUM_OF_MERGED_PR_WITHOUT_ACTIONS,
      'Closed PR W/O Actions': this.NUM_OF_CLOSED_PR_WITHOUT_ACTIONS,
    };
  }
}
