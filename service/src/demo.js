import { g, r, y } from 'common/utilities/colors.js';
import { getFilesFromDir } from 'common/utilities/files.js';
import { hashImage } from 'common/utilities/hash.js';
import { AiLabel, RealLabel } from 'common/utilities/huggingface.js';
import { getImageData } from 'common/utilities/image.js';
import { loadSettings } from 'common/utilities/settings.js';

import { insertNewUser } from './services/db/userColl.js';
import { upsertVotedLabel } from './services/db/voteColl.js';
import { checkIfAI } from './services/detector.js';
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
 * @param {{uri: string, isAI: boolean}} input
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
  const result = (await checkIfAI(data)) >= 0.9;

  const msg = result ? 'This image is AI generated\n' : 'This image is real\n';
  if (result === isAI) {
    console.log(g(msg));
    return true;
  } else {
    console.error(r(msg));
    const { userId } = await insertNewUser();
    await upsertVotedLabel(hashImage(data), userId, {
      voteLabel: result ? RealLabel : AiLabel,
    });
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
