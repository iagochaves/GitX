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
  }

  write(data: any) {
    this.stringifier.write(data);
  }

  pipe() {
    const piped = this.stringifier.pipe(this.writableStream, { end: true });
    piped.on('finish', () => console.log('FINISHED PIPE'));
    piped.on('close', () => console.log('CLOSED PIPE'));
    piped.on('unpipe', () => console.log('UNPIPED PIPE'));
  }

  close() {
    this.writableStream.close();
  }
}
