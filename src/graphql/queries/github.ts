import { gql } from 'graphql-request';

type PullRequestsNode = {
  number: number;
  merged: string;
  title: string;

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
            };
          }[];
        };
      };
    }[];
  };
};

export interface FetchGitHubQueryResult {
  repository: {
    pullRequests: {
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

export const fetchGitHubQuery = gql`
  query FetchGitHub(
    $REPO_NAME: String!
    $REPO_OWNER: String!
    $NUM_OF_PRS: Int!
  ) {
    repository(name: $REPO_NAME, owner: $REPO_OWNER) {
      pullRequests(states: [CLOSED, MERGED], last: $NUM_OF_PRS) {
        nodes {
          number
          merged
          title
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
