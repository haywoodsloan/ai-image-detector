import { getFilesFromDir } from 'common/utilities/files.js';
import { mkdir, readFile, rm, stat, watch, writeFile } from 'fs/promises';
import Handlebars from 'handlebars';
import { dirname, join } from 'path';

Handlebars.registerHelper('datestamp', () => {
  const date = new Date();
  const year = String(date.getFullYear());
  const month = String(date.getMonth()).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
});

const compilePath = '.compiled/';
const compileConfigPath = join(compilePath, 'config/');
await rm(compileConfigPath, { force: true, recursive: true });

const configPath = 'config/';
const configs = await getFilesFromDir(configPath);
for (const config of configs) {
  console.log(`Compiling ${config}`);
  await compile(config);
}

console.log('Watching for config changes...');
const watcher = watch(configPath, { recursive: true });
for await (const { filename } of watcher) {
  const filePath = join(configPath, filename);
  try {
    const fileStats = await stat(filePath);
    if (!fileStats.isFile()) continue;

    console.log(`Changed ${filePath}`);
    await compile(filePath);
  } catch {
    console.log(`Removed ${filePath}`);
    await rm(join(compilePath, filePath), { force: true, recursive: true });
  }
}

async function compile(filename) {
  const template = Handlebars.compile(await readFile(filename, 'utf8'));
  const compiled = template();

  const outputPath = join(compilePath, filename);
  const parentPath = dirname(outputPath);

  await mkdir(parentPath, { recursive: true });
  await writeFile(outputPath, compiled);
}
