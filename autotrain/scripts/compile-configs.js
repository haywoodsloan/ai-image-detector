import {
  mkdir,
  readFile,
  readdir,
  rm,
  stat,
  watch,
  writeFile,
} from 'fs/promises';
import Handlebars from 'handlebars';
import { dirname, join, parse, relative } from 'path';
import YAML from 'yaml';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

const DatetimeRegex = /{{\s*datetime\s*}}/;
const AutoRefreshInterval = 5 * 60 * 1000;
const MaxModTimeDiff = 5000;

const CompilePath = '.compiled/';
const ConfigPath = 'config/';
const CompileConfigPath = join(CompilePath, ConfigPath);

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
const args = await yargs(hideBin(process.argv)).boolean('watch').parse();

// Clear old configs and compile new ones
await rm(CompileConfigPath, { force: true, recursive: true });
await compileAll();

// If not watching end after compiling
if (!args.watch) {
  console.log('Configs successfully compiled');
  process.exit(0);
}

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
    console.log('Model list changed, compiling updates');
    await compileDiff();
  } else {
    console.log(`Recompiling ${filePath}`);
    const { name } = parse(filename);
    await compile(name);
  }
}

async function compileAll() {
  const baseTemplate = await getBaseTemplate();
  const models = await getModelList();

  for (const model of models) {
    const baseContent = baseTemplate({ model });
    await compile(model, YAML.parse(baseContent));
  }
}

async function compileDiff() {
  const newModels = await getModelList();

  const configEntries = await readdir(CompileConfigPath, {
    recursive: true,
    withFileTypes: true,
  });

  const existingModels = configEntries
    .filter((entry) => entry.isFile())
    .map((entry) => {
      const { name } = parse(entry.name);
      const prefix = relative(CompileConfigPath, entry.parentPath);
      return `${prefix.replaceAll('\\', '/')}/${name}`;
    });

  const removeModels = existingModels.filter(
    (model) => !newModels.includes(model)
  );

  for (const model of removeModels) {
    const modelPath = join(CompileConfigPath, `${model}.yml`);
    await rm(modelPath, { force: true });
  }

  const addModels = newModels.filter(
    (model) => !existingModels.includes(model)
  );

  if (!addModels.length) return;
  const baseTemplate = await getBaseTemplate();

  for (const model of addModels) {
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
  const hasDatetime = DatetimeRegex.test(baseContent);

  if (hasDatetime) refreshConfigs.add(BasePath);
  else refreshConfigs.delete(BasePath);

  return Handlebars.compile(baseContent);
}

/**
 * @returns {Promise<string[]>}
 */
async function getModelList() {
  const modelsContent = await readFile(ModelsPath, 'utf8');
  return YAML.parse(modelsContent);
}
