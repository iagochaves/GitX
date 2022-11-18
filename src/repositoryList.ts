/* eslint-disable class-methods-use-this */
import fs from 'node:fs';
import { resolve } from 'node:path';
import { Repository } from './repository';
import { WritableStream } from './services/writableStream';

export class RepositoryList {
  private TOTAL_REPOS = 0;

  private writableStream: WritableStream;

  private repositories: Repository[];

  private actionsStream: fs.WriteStream;

  private externalStream: fs.WriteStream;

  private noCIStream: fs.WriteStream;

  constructor() {
    this.repositories = [];
    this.writableStream = new WritableStream('repositories2');

    this.actionsStream = fs.createWriteStream(
      resolve(__dirname, '../documents/generated', 'actions.txt'),
    );

    this.externalStream = fs.createWriteStream(
      resolve(__dirname, '../documents/generated', 'external-ci.txt'),
    );

    this.noCIStream = fs.createWriteStream(
      resolve(__dirname, '../documents/generated', 'no-ci.txt'),
    );
  }

  get getActionsStream() {
    return this.actionsStream;
  }

  get getExternalStream() {
    return this.externalStream;
  }

  get getNoCIStream() {
    return this.noCIStream;
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

    if (this.repositories.length === this.TOTAL_REPOS) {
      this.writableStream.pipe();
      // this.resolutionTimeStream.pipe();
    }
  }
}
