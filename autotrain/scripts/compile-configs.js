import { getFilesFromDir } from 'common/utilities/files.js';
import { mkdir, readFile, rm, stat, watch, writeFile } from 'fs/promises';
import Handlebars from 'handlebars';
import { dirname, join } from 'path';

const AutoRefreshInterval = 5 * 60 * 1000;
const CompilePath = '.compiled/';
const ConfigPath = 'config/';

Handlebars.registerHelper('datetime', () => {
  const date = new Date();

  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');

  return `${year}${month}${day}-${hour}${minute}`;
});

/** @type {Set<string>} */
const refreshConfigs = new Set();

const compileConfigPath = join(CompilePath, ConfigPath);
await rm(compileConfigPath, { force: true, recursive: true });

const configs = await getFilesFromDir(ConfigPath);
for (const config of configs) {
  console.log(`Compiling ${config}`);
  await compile(config);
}

// Recompile periodically support datetime updates
setTimeout(async () => {
  for (const config of refreshConfigs) {
    await compile(config);
  }
}, AutoRefreshInterval);

console.log('Watching for config changes...');
const watcher = watch(ConfigPath, { recursive: true });
for await (const { filename } of watcher) {
  const filePath = join(ConfigPath, filename);
  try {
    const fileStats = await stat(filePath);
    if (!fileStats.isFile()) continue;

    console.log(`Changed ${filePath}`);
    await compile(filePath);
  } catch {
    refreshConfigs.delete(filePath);
    console.log(`Removed ${filePath}`);
    await rm(join(CompilePath, filePath), { force: true, recursive: true });
  }
}

async function compile(filename) {
  const fileContent = await readFile(filename, 'utf8');

  const hasDatetime = /{{\s*datetime\s*}}/.test(fileContent);
  if (hasDatetime) refreshConfigs.add(filename);
  else refreshConfigs.delete(filename);

  const template = Handlebars.compile(fileContent);
  const compiled = template();

  const outputPath = join(CompilePath, filename);
  const parentPath = dirname(outputPath);

  await mkdir(parentPath, { recursive: true });
  await writeFile(outputPath, compiled);
}
