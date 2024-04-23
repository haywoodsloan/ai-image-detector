import { isDev } from './utilities/environment.js';
import { loadLocalSettings } from './utilities/settings.js';
import { checkIfAI } from './services/detector.js';

// Load local settings for Hugging Face key
if (isDev) {
  await loadLocalSettings();
}

// A DALL-E 2 image
await checkAndPrint(
  'https://images.openai.com/blob/d3b684dc-eb13-4fbd-a77e-0a397e059fef/dall-e-2.jpg'
);

// A DALL-E 3 image
await checkAndPrint(
  'https://images.openai.com/blob/3373e35f-a51d-4ba0-b03c-8eb943c3ea44/basketball3.png'
);

// A real picture of a fox
await checkAndPrint(
  'https://www.aces.edu/wp-content/uploads/2022/08/shutterstock_162620897-scaled.jpg'
);

// A real Picasso Image
await checkAndPrint(
  'https://assets.dm.rccl.com/is/image/RoyalCaribbeanCruises/royal/ports-and-destinations/destinations/spain-portugal-canary-islands/abstract-drawing-woman-head-cubist-art.jpg'
);

console.log('done!');

async function checkAndPrint(url) {
  console.log(`Checking if the image at this URL is AI generated: ${url}`);
  const result = await checkIfAI(url);
  console.log(result ? 'This image is AI generated' : 'This image is real');
}
