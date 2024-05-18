import { readdir } from 'fs/promises';
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
