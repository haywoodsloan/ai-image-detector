import { isDev } from "./utilities/environment.js";
import { loadLocalSettings } from "./utilities/settings.js";
import { checkIfAI } from "./services/detector.js";
import { isHttpUrl, shortenUrl } from "./utilities/url.js";
import { shortenPath } from "./utilities/path.js";
import color from "cli-color";
import { glob } from "glob";

const demoUrls = Object.freeze([
  // A DALL-E 2 image
  {
    uri: "https://images.openai.com/blob/d3b684dc-eb13-4fbd-a77e-0a397e059fef/dall-e-2.jpg",
    isAI: true,
  },
  // A DALL-E 3 image
  {
    uri: "https://images.openai.com/blob/3373e35f-a51d-4ba0-b03c-8eb943c3ea44/basketball3.png",
    isAI: true,
  },
  // A real picture of a fox
  {
    uri: "https://www.aces.edu/wp-content/uploads/2022/08/shutterstock_162620897-scaled.jpg",
    isAI: false,
  },
  // A real Picasso Image
  {
    uri: "https://assets.dm.rccl.com/is/image/RoyalCaribbeanCruises/royal/ports-and-destinations/destinations/spain-portugal-canary-islands/abstract-drawing-woman-head-cubist-art.jpg",
    isAI: false,
  },
]);

// Load local settings for Hugging Face key
if (isDev) {
  await loadLocalSettings();
}

// Test each demo uri
for (const url of demoUrls) {
  await checkAndPrint(url);
}

// Test for each local demo file
const artificialFiles = await glob("data/images/artificial/**/*");
for (const uri of artificialFiles) {
  await checkAndPrint({ uri, isAI: true });
}

const realFiles = await glob("data/images/real/**/*");
for (const uri of realFiles) {
  await checkAndPrint({ uri, isAI: false });
}

console.log(color.yellow("DONE!"));

/**
 * @param {string} uri
 */
async function checkAndPrint({ uri, isAI }) {
  if (isHttpUrl(uri)) {
    console.log(
      `Checking if the image at this uri is AI generated: ${shortenUrl(uri)}`,
    );
  } else {
    console.log(
      `Checking if the image at this path is AI generated: ${shortenPath(uri)}`,
    );
  }

  const result = await checkIfAI(uri);
  const msg = result ? "This image is AI generated\n" : "This image is real\n";

  if (result === isAI) {
    console.log(color.green(msg));
  } else {
    console.error(color.red(msg));
  }
}
