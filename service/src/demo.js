import { ConfigPath } from './constants.js';
import { checkIfAI } from './services/detector.js';
import { shortenPath } from './utilities/path.js';
import { isHttpUrl, shortenUrl } from './utilities/url.js';
import color from 'cli-color';
import { loadSettings } from 'common/utilities/settings.js';
import { glob } from 'glob';

// Load settings for Hugging Face key
await loadSettings(ConfigPath);

// Track stats
let total = 0;
let correct = 0;

// Test each local demo file
const artificialFiles = await glob('data/images/artificial/**/*');
for (const uri of artificialFiles) {
  total++;
  (await checkAndPrint({ uri, isAI: true })) && correct++;
}

const realFiles = await glob('data/images/human/**/*');
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
  console.log(color.red(report));
} else if (score <= 75) {
  console.log(color.yellow(report));
} else {
  console.log(color.green(report));
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

  const result = await checkIfAI(uri);
  const msg = result ? 'This image is AI generated\n' : 'This image is real\n';

  if (result === isAI) {
    console.log(color.green(msg));
    return true;
  } else {
    console.error(color.red(msg));
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
