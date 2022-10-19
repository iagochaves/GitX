import { gql } from 'graphql-request';

export type PullRequestsNode = {
  merged: boolean;
  number: number;
  title: string;
  createdAt: string;
  closedAt: string;
  comments: {
    totalCount: number;
  };
  commits: {
    nodes: {
      commit: {
        status: {
          state: string;
        } | null;
        checkSuites: {
          totalCount: number;
          nodes: {
            conclusion: string;
            app: {
              name: string;
            } | null;
          }[];
        };
      };
    }[];
  };
};

export interface FetchPullRequestQueryResult {
  repository: {
    pullRequests: {
      pageInfo: {
        hasNextPage: boolean;
        endCursor: string;
      };
      nodes: PullRequestsNode[];
    };
  };
}

export interface SearchRepositoriesResult {
  search: {
    nodes: {
      nameWithOwner: string;
      stargazerCount: number;
      pullRequests: {
        nodes: PullRequestsNode[];
      };
    }[];
  };
}

export const fetchPullRequestQuery = gql`
  query FetchPullRequestQuery(
    $REPO_NAME: String!
    $REPO_OWNER: String!
    $NUM_OF_PRS: Int!
    $CURSOR: String
  ) {
    repository(name: $REPO_NAME, owner: $REPO_OWNER) {
      pullRequests(
        states: [CLOSED, MERGED]
        first: $NUM_OF_PRS
        after: $CURSOR
      ) {
        pageInfo {
          hasNextPage
          endCursor
        }
        nodes {
          number
          merged
          comments {
            totalCount
          }
          title
          createdAt
          closedAt
          commits(last: 1) {
            nodes {
              commit {
                status {
                  state
                }
                checkSuites(first: 100) {
                  totalCount
                  nodes {
                    conclusion
                    app {
                      name
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`;

export const searchRepositoriesQuery = gql`
  query searchRepositories($NUM_OF_REPOS: Int!) {
    search(
      first: $NUM_OF_REPOS
      query: "stars:>30000 sort:stars language:javascript language:typescript"
      type: REPOSITORY
    ) {
      nodes {
        ... on Repository {
          nameWithOwner
          stargazerCount
        }
      }
    }
  }
`;
