/* eslint-disable no-restricted-syntax */
import { Repository } from './repository';
import { RepositoryList } from './repositoryList';

async function main(): Promise<void> {
  const repositoryList = new RepositoryList();

  const repositories = repositoryList.readRepositories();

  repositories.forEach(async (repositoryName) => {
    console.log('Fetching data for ->', repositoryName);

    const repository = new Repository(repositoryName);
    await repository.readPullRequests();
  });
}

main();
