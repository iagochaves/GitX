/* eslint-disable class-methods-use-this */
import fs from 'node:fs';
import { resolve } from 'node:path';
import { Repository } from './repository';
import { WritableStream } from './services/writableStream';

export class RepositoryList {
  private repositories: Repository[];

  private writableStream: WritableStream;

  constructor() {
    this.writableStream = new WritableStream('repositories');
    this.repositories = [];
  }

  readRepositories() {
    const reposFileData = fs.readFileSync(
      resolve(__dirname, '../documents', 'repos.txt'),
      { encoding: 'utf8' },
    );

    const reposData = reposFileData.toString().trim().split('\n');

    return reposData;
  }

  add(repository: Repository) {
    this.repositories.push(repository);
  }
}
