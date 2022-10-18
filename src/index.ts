/* eslint-disable no-restricted-syntax */
import { PullRequest } from './pullRequest';
import { Repository } from './repository';

async function main(): Promise<void> {
  const NUM_OF_PRS = 100;
  const repository = new Repository();
  let promisesStack = [];

  for await (const data of repository.readRepositories()) {
    console.log('Fetching for -> ', data);
    const pullRequest = new PullRequest(NUM_OF_PRS);

    const pullRequestPromise = new Promise((resolve) =>
      // eslint-disable-next-line no-promise-executor-return
      resolve(pullRequest.fetchPullRequest(data)),
    );
    promisesStack.push(pullRequestPromise);

    if (promisesStack.length % 2 === 0) {
      const responses = await Promise.all(promisesStack);
      console.log(responses);
      responses.forEach((response) =>
        repository.writePullRequestResult(response),
      );
      promisesStack = [];
    }
  }
}

main();
