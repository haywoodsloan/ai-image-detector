import { getFilesFromDir } from 'common/utilities/files.js';
import { mkdir, readFile, rmdir, writeFile } from 'fs/promises';
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

try {
  await rmdir(compileConfigPath);
} catch {
  /* ignore if dir doesn't exist */
}

const configPath = 'config/';
const configs = await getFilesFromDir(configPath);

for (const config of configs) {
  const template = Handlebars.compile(await readFile(config, 'utf8'));
  const compiled = template();

  const outputPath = join(compilePath, config);
  const parentPath = dirname(outputPath);

  await mkdir(parentPath, { recursive: true });
  await writeFile(outputPath, compiled);
}
