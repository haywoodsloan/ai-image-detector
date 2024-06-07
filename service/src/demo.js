import { g, r, y } from 'common/utilities/colors.js';
import { getFilesFromDir } from 'common/utilities/files.js';
import { loadSettings } from 'common/utilities/settings.js';

import { upsertVotedClass } from './services/db/voteColl.js';
import {
  AiClassLabel,
  RealClassLabel,
  checkIfAI,
} from './services/detector.js';
import { hashImage } from './utilities/hash.js';
import { getImageData } from './utilities/image.js';
import { shortenPath } from './utilities/path.js';
import { isHttpUrl, shortenUrl } from './utilities/url.js';

// Load settings for Hugging Face key
await loadSettings();

// Track stats
let total = 0;
let correct = 0;

// Test each local demo file
const artificialFiles = await getFilesFromDir('data/images/artificial/');
for (const uri of artificialFiles) {
  total++;
  (await checkAndPrint({ uri, isAI: true })) && correct++;
}

const realFiles = await getFilesFromDir('data/images/human/');
for (const uri of realFiles) {
  total++;
  (await checkAndPrint({ uri, isAI: false })) && correct++;
}

const score = round((correct / total) * 100);
const report = [
  `Correct: ${correct}`,
  `Total:   ${total}`,
  `Score:   ${score}%`,
  `DONE!`,
].join('\n');

if (score <= 50) {
  console.log(r(report));
} else if (score <= 75) {
  console.log(y(report));
} else {
  console.log(g(report));
}

/**
 * @param {string} uri
 */
async function checkAndPrint({ uri, isAI }) {
  if (isHttpUrl(uri)) {
    console.log(
      `Checking if the image at this url is AI generated: ${shortenUrl(uri)}`
    );
  } else {
    console.log(
      `Checking if the image at this path is AI generated: ${shortenPath(uri)}`
    );
  }

  const data = await getImageData(uri);
  const result = await checkIfAI(data);

  const msg = result ? 'This image is AI generated\n' : 'This image is real\n';
  if (result === isAI) {
    console.log(g(msg));
    return true;
  } else {
    console.error(r(msg));
    await upsertVotedClass(
      hashImage(data),
      '0000-1111-2222-3333-4444',
      result ? RealClassLabel : AiClassLabel
    );
    return false;
  }
}

/**
 *
 * @param {number} num
 * @param {number} places
 */
function round(num, places = 2) {
  const multiplier = Math.pow(10, places);
  return Math.round((num + Number.EPSILON) * multiplier) / multiplier;
}
