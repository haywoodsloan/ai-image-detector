import { mkdir, readFile, rm, stat, watch, writeFile } from 'fs/promises';
import Handlebars from 'handlebars';
import { dirname, join, parse } from 'path';
import YAML from 'yaml';

const DatetimeRegex = /{{\s*datetime\s*}}/;
const AutoRefreshInterval = 5 * 60 * 1000;
const MaxModTimeDiff = 5000;

const CompilePath = '.compiled/';
const ConfigPath = 'config/';

const BasePath = join(ConfigPath, 'base.yml.hbs');
const ModelsPath = join(ConfigPath, 'models.yml');

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
await compileAll();

// Recompile periodically to support datetime updates
setInterval(async () => {
  if (refreshConfigs.has(BasePath)) {
    await compileAll();
  } else {
    for (const config of refreshConfigs) await compile(config);
  }
}, AutoRefreshInterval);

console.log('Configs successfully compiled, watching for changes...');
const watcher = watch(ConfigPath, { recursive: true });
for await (const { filename, eventType } of watcher) {
  if (eventType !== 'change') continue;

  const filePath = join(ConfigPath, filename);
  const fileStats = await stat(filePath);
  const modTimeDiff = Date.now() - fileStats.mtime;

  if (!fileStats.isFile()) continue;
  if (modTimeDiff > MaxModTimeDiff) continue;

  if (filePath === BasePath) {
    console.log('Base config changed, recompiling all');
    await compileAll();
  } else if (filePath === ModelsPath) {
    console.log('Model list changed, recompiling all');
    await compileAll();
  } else {
    console.log(`Recompiling ${filePath}`);
    const { name } = parse(filename);
    await compile(name);
  }
}

async function compileAll() {
  const baseTemplate = await getBaseTemplate();

  const modelsContent = await readFile(ModelsPath, 'utf8');
  const models = YAML.parse(modelsContent);

  for (const model of models) {
    const baseContent = baseTemplate({ model });
    await compile(model, YAML.parse(baseContent));
  }
}

/**
 * @param {string} modelPath
 * @param {any} baseConfig
 */
async function compile(model, baseConfig = null) {
  if (!baseConfig) {
    const baseTemplate = await getBaseTemplate();
    const baseContent = baseTemplate({ model });
    baseConfig = YAML.parse(baseContent);
  }

  const fileName = join(ConfigPath, `${model}.yml`);
  const merged = {};

  try {
    const fileContent = await readFile(fileName, 'utf8');
    const hasDatetime = DatetimeRegex.test(fileContent);

    if (hasDatetime) refreshConfigs.add(model);
    else refreshConfigs.delete(model);

    const template = Handlebars.compile(fileContent);
    const compiled = template();

    const parsed = YAML.parse(compiled);
    Object.assign(merged, baseConfig, parsed);
  } catch {
    Object.assign(merged, baseConfig);
  }

  const output = YAML.stringify(merged);
  const outputPath = join(CompilePath, fileName);
  const parentPath = dirname(outputPath);

  await mkdir(parentPath, { recursive: true });
  await writeFile(outputPath, output);
}

async function getBaseTemplate() {
  const baseContent = await readFile(BasePath, 'utf8');
  const baseHasDatetime = DatetimeRegex.test(baseContent);

  if (baseHasDatetime) refreshConfigs.add(BasePath);
  else refreshConfigs.delete(BasePath);

  return Handlebars.compile(baseContent);
}
