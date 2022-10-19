import { Stringifier, stringify } from 'csv-stringify';
import fs from 'node:fs';
import { resolve } from 'node:path';

export class WritableStream {
  private stringifier: Stringifier;

  private writableStream: fs.WriteStream;

  constructor(fileName: string) {
    this.writableStream = fs.createWriteStream(
      resolve(__dirname, `../documents/generated`, `${fileName}.csv`),
    );

    this.stringifier = stringify({ header: true });
    this.stringifier.on('close', () => this.writableStream.close());
  }

  write(data: unknown) {
    this.stringifier.write(data);
  }

  pipe() {
    this.stringifier.pipe(this.writableStream, { end: true });
    this.stringifier.end();
  }
}
