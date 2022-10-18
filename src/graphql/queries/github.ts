import { gql } from 'graphql-request';

type PullRequestsNode = {
  merged: boolean;
  number: number;
  createdAt: string;
  closedAt: string;
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

export interface SearchPullRequestResult {
  search: {
    issueCount: number;
    edges: {
      cursor: string;
      node: PullRequestsNode;
    }[];
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

export const searchPullRequest = gql`
  query SearchPullRequest($QUERY: String!, $NUM_OF_PRS: Int!, $CURSOR: String) {
    search(query: $QUERY, type: ISSUE, first: $NUM_OF_PRS, after: $CURSOR) {
      issueCount
      edges {
        cursor
        node {
          ... on PullRequest {
            number
            merged
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
