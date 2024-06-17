import { createReadStream, createWriteStream } from 'fs';
import { appendFile, readdir } from 'fs/promises';
import { EOL } from 'os';
import { join } from 'path';

/**
 * @param {string | URL} dir
 */
export async function getFilesFromDir(dir) {
  // Get all entries from the path
  const entries = await readdir(dir, {
    recursive: true,
    withFileTypes: true,
  });

  // Filter to just the images
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => join(entry.parentPath, entry.name));
}

/**
 * @param {string} path
 */
export async function* readLines(path) {
  const stream = createReadStream(path, {
    encoding: 'utf8',
  });

  const buffer = [];
  for await (const chunk of stream) {
    for (const char of chunk) {
      if (char === '\n') {
        const line = buffer.join('');
        buffer.length = 0;
        yield line;
      } else if (char !== '\r') buffer.push(char);
    }
  }

  if (buffer.length) {
    yield buffer.join('');
  }
}

/**
 * @param {string} path
 * @param {string[] | AsyncGenerator<string>} lines
 */
export async function appendLines(path, lines) {
  if (Array.isArray(lines)) {
    await appendFile(path, lines.join(EOL) + EOL);
  } else {
    const stream = createWriteStream(path, { flags: 'a' });
    for await (const line of lines) {
      stream.write(line + EOL);
    }
    await new Promise((res) => stream.end(res));
  }
}
