/* eslint-disable no-restricted-syntax */
import { Repository } from './repository';
import { RepositoryList } from './repositoryList';

async function main(): Promise<void> {
  const repositoryList = new RepositoryList();

  const repositories = repositoryList.readRepositories();

  const repositoriesQueue: string[][] = [];

  while (repositories.length) {
    const nextQueue = repositories.splice(0, 3);
    repositoriesQueue.push(nextQueue);
  }

  for await (const repositoryQueue of repositoriesQueue) {
    const fetchQueue: Promise<Repository>[] = repositoryQueue.map(
      (repositoryName) => {
        return new Promise((resolve) => {
          console.log('Fetching data for ->', repositoryName);

          const repository = new Repository(
            repositoryName,
            repositoryList.resolutionWritableStream,
          );

          repository.readPullRequests().then(() => resolve(repository));
        });
      },
    );

    const repositoriesData = await Promise.all(fetchQueue);
    repositoriesData.forEach((repository) => repositoryList.add(repository));
  }
  // repositories.forEach((repositoryName, index) => {
  //   setTimeout(() => {
  //     console.log('Fetching data for ->', repositoryName);

  //     const repository = new Repository(
  //       repositoryName,
  //       repositoryList.resolutionWritableStream,
  //     );
  //     repository.readPullRequests().then(() => {
  //       repositoryList.add(repository);
  //     });
  //   }, 5000 * (index + 1));
  // });
}

main();
