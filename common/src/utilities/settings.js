import { readFile } from 'fs/promises';
import { join } from 'path';

import { isProd } from './environment.js';

/**
 * @param {string} configPath
 */
export async function loadSettings(configPath = './') {
  // Track the accumulated settings
  const settings = {};

  // Load base settings
  const baseSettingsPath = join(configPath, 'settings.json');
  Object.assign(settings, await loadSettingsFile(baseSettingsPath));

  // Load env settings
  if (isProd) {
    const prodSettingsPath = join(configPath, 'prod.settings.json');
    Object.assign(settings, await loadSettingsFile(prodSettingsPath));
  } else {
    const devSettingsPath = join(configPath, 'dev.settings.json');
    Object.assign(settings, await loadSettingsFile(devSettingsPath));
  }

  // Load local settings (for secrets)
  const localSettingsPath = join(configPath, 'local.settings.json');
  Object.assign(settings, await loadSettingsFile(localSettingsPath));

  // Assign the settings into the environment
  // Also return them directly
  Object.assign(process.env, settings);
  return settings;
}

/**
 * @param {string | URL} path
 */
async function loadSettingsFile(path) {
  try {
    const buffer = await readFile(path);
    return JSON.parse(buffer);
  } catch {
    // File doesn't exists, skip it
    return null;
  }
}
