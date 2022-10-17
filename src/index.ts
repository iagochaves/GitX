/* eslint-disable no-restricted-syntax */
import { PullRequest } from './pullRequest';
import { Repository } from './repository';

async function main(): Promise<void> {
  const NUM_OF_PRS = 100;
  const repository = new Repository();

  for await (const data of repository.readRepositories()) {
    const pullRequest = new PullRequest(NUM_OF_PRS);

    pullRequest
      .fetchPullRequest(data)
      .then((response) => repository.writePullRequestResult(response));
  }
}

main();
