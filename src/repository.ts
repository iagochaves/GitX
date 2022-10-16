/* eslint-disable no-restricted-syntax */
import { Stringifier, stringify } from 'csv-stringify';
import fs from 'node:fs';
import { resolve } from 'node:path';
import { PullRequestData } from './pullRequest';

export class Repository {
  private REPO_COUNTER = 0;

  private NUM_OF_TOTAL_REPOS = 0;

  private stringifier: Stringifier;

  private writableStream: fs.WriteStream;

  constructor() {
    this.writableStream = fs.createWriteStream(
      resolve(__dirname, 'documents/generated', 'generated.csv'),
    );

    this.stringifier = stringify({ header: true });
  }

  async *readRepositories() {
    const reposFileData = fs.readFileSync(
      resolve(__dirname, 'documents', 'repos.txt'),
      { encoding: 'utf8' },
    );

    const reposData = reposFileData.toString().split('\n');
    this.NUM_OF_TOTAL_REPOS = reposData.length;

    for (const repo of reposData) {
      yield repo;
    }
  }

  writePullRequestResult(pullRequestData: PullRequestData) {
    this.REPO_COUNTER += 1;
    this.stringifier.write(pullRequestData);

    if (this.REPO_COUNTER === this.NUM_OF_TOTAL_REPOS) {
      this.stringifier.pipe(this.writableStream, { end: true });
    }
  }
}
