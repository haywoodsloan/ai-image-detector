import merge from 'deepmerge';
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

const args = await yargs(hideBin(process.argv))
  .boolean('watch')
  .string('model')
  .string('out')
  .parse();

const DatetimeRegex = /{{\s*datetime\s*}}/;
const AutoRefreshInterval = 5 * 60 * 1000;
const MaxModTimeDiff = 5000;

const CompilePath = '.compiled/';
const ConfigPath = 'config/';
const OutputConfigPath = join(args.out ?? CompilePath, ConfigPath);

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

Handlebars.registerHelper('randSeed', () => {
  return Math.round(Math.random() * 10_000 + 1).toString();
});

/** @type {Set<string>} */
const refreshModels = new Set();

// If a specific model is requested just compile that
if (args.model) {
  console.log(`Compiling ${args.model}`);
  await compile(args.model);
  process.exit(0);
}

// Clear old configs and compile new ones
await rm(OutputConfigPath, { force: true, recursive: true });
await compileAll();

// If not watching end after compiling
if (!args.watch) {
  console.log('Configs successfully compiled');
  process.exit(0);
}

// Recompile periodically to support datetime updates
setInterval(async () => {
  if (refreshModels.has(BasePath)) {
    await compileAll();
  } else {
    const baseTemplate = await getBaseTemplate();
    for (const model of refreshModels) {
      const baseContent = baseTemplate({ model });
      await compile(model, YAML.parse(baseContent));
    }
  }
}, AutoRefreshInterval);

console.log('Configs successfully compiled, watching for changes...');
const watcher = watch(ConfigPath, { recursive: true });
for await (const { filename, eventType } of watcher) {
  if (eventType !== 'change') continue;

  // Double check the modify time, sometimes a change event is a false positive
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
    const { name, dir } = parse(filename);
    const model = `${dir.replaceAll('\\', '/')}/${name}`;
    console.log(`Recompiling ${model}`);
    await compile(model);
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

  const configEntries = await readdir(OutputConfigPath, {
    recursive: true,
    withFileTypes: true,
  });

  // Must convert to standard model '/' separator
  const existingModels = configEntries
    .filter((entry) => entry.isFile())
    .map((entry) => {
      const { name } = parse(entry.name);
      const prefix = relative(OutputConfigPath, entry.parentPath);
      return `${prefix.replaceAll('\\', '/')}/${name}`;
    });

  // Remove existing configs for models not on the list
  const removeModels = existingModels.filter(
    (model) => !newModels.includes(model)
  );

  for (const model of removeModels) {
    const modelPath = join(OutputConfigPath, `${model}.yml`);
    await rm(modelPath, { force: true });
  }

  // Add configs for models added to the list
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
 * @param {string} model
 * @param {any} baseConfig
 */
async function compile(model, baseConfig = null) {
  if (!baseConfig) {
    const baseTemplate = await getBaseTemplate();
    const baseContent = baseTemplate({ model });
    baseConfig = YAML.parse(baseContent);
  }

  const fileName = join(ConfigPath, `${model}.yml`);
  let merged;

  try {
    const fileContent = await readFile(fileName, 'utf8');
    const hasDatetime = DatetimeRegex.test(fileContent);

    // Track models to refresh with periodic datetime changes
    if (hasDatetime) refreshModels.add(model);
    else refreshModels.delete(model);

    const template = Handlebars.compile(fileContent);
    const compiled = template();

    // Merge the model specific config and the base
    const parsed = YAML.parse(compiled);
    merged = merge.all([baseConfig, parsed]);
  } catch {
    merged = merge.all([baseConfig]);
  }

  const output = YAML.stringify(merged);
  const outputPath = join(args.out ?? CompilePath, fileName);
  const parentPath = dirname(outputPath);

  await mkdir(parentPath, { recursive: true });
  await writeFile(outputPath, output);
}

async function getBaseTemplate() {
  const baseContent = await readFile(BasePath, 'utf8');
  const hasDatetime = DatetimeRegex.test(baseContent);

  if (hasDatetime) refreshModels.add(BasePath);
  else refreshModels.delete(BasePath);

  return Handlebars.compile(baseContent);
}

/**
 * @returns {Promise<string[]>}
 */
async function getModelList() {
  const modelsContent = await readFile(ModelsPath, 'utf8');
  return YAML.parse(modelsContent);
}
