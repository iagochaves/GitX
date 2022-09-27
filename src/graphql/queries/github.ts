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
        };
        checkSuites: {
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

export const FetchGitHubQuery = gql`
  query FetchGitHub(
    $REPO_NAME: String!
    $REPO_OWNER: String!
    $NUMBER_OF_PRS: Int!
  ) {
    repository(name: $REPO_NAME, owner: $REPO_OWNER) {
      pullRequests(states: [CLOSED, MERGED], last: $NUMBER_OF_PRS) {
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
                  nodes {
                    conclusion
                    app {
                      name
                    }
                    # checkRuns(first: 100) {
                    #   nodes {
                    #     name
                    #     conclusion
                    #     permalink
                    #   }
                    # }
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
