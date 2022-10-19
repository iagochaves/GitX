/* eslint-disable class-methods-use-this */
import fs from 'node:fs';
import { resolve } from 'node:path';
import { Repository } from './repository';
import { WritableStream } from './services/writableStream';

export class RepositoryList {
  private TOTAL_REPOS = 0;

  private writableStream: WritableStream;

  private repositories: Repository[];

  constructor() {
    this.repositories = [];
    this.writableStream = new WritableStream('repositories');
  }

  readRepositories() {
    const reposFileData = fs.readFileSync(
      resolve(__dirname, '../documents', 'repos.txt'),
      { encoding: 'utf8' },
    );

    const reposData = reposFileData
      .toString()
      .trim()
      .split('\n')
      .map((repo) => repo.trim());

    this.TOTAL_REPOS = reposData.length;

    return reposData;
  }

  add(repository: Repository) {
    this.repositories.push(repository);
    const data = repository.getData();
    this.writableStream.write(data);

    console.log('REPO DATA', data);
    if (this.repositories.length === this.TOTAL_REPOS) {
      this.writableStream.pipe();
    }
  }
}
