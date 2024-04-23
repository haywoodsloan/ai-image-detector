import fs from 'fs/promises';

export async function loadLocalSettings() {
  const settingsPath = new URL('../../local.settings.json', import.meta.url)
  const buffer = await fs.readFile(settingsPath);
  const settings = JSON.parse(buffer);
  Object.assign(process.env, settings);
}
