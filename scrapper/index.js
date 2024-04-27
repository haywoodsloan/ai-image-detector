import puppeteer from 'puppeteer';
import { writeFile, mkdir, readFile } from 'fs/promises';
import { listFiles, uploadFile } from '@huggingface/hub';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { basename } from 'path';

const args = yargs(hideBin(process.argv))
  .option('count', {
    type: 'number',
    description: 'The maximum number of images to download',
    demandOption: 'Must specify a maxmium number of images to scrape',
  })
  .option('real', {
    type: 'boolean',
    description: 'If real (non-AI) images should be downloaded',
    default: false,
  })
  .option('output', {
    type: 'string',
    description: 'The output path',
  }).argv;

args.output ||= args.real ? './data/real' : './data/artificial';
const { hfKey } = JSON.parse(
  await readFile(new URL('./settings.local.json', import.meta.url))
);

const files = listFiles({
  repo: { name: 'haywoodsloan/ai-images', type: 'dataset' },
  path: args.real ? 'human' : 'artificial',
  credentials: { accessToken: hfKey },
});

const existing = new Set();
for await (const file of files) {
  existing.add(basename(file.path));
}

const browser = await puppeteer.launch();
const page = await browser.newPage();

await page.setViewport({ width: 1920, height: 1080 });
await page.setUserAgent(
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
);

await mkdir(args.output, { recursive: true });
const redditUrl = args.real
  ? 'https://www.reddit.com/r/Art/'
  : 'https://www.reddit.com/r/aiArt';

await page.goto(redditUrl, {
  waitUntil: 'networkidle0',
});

let count = 0;
while (count < args.count) {
  const newUrls = await page.evaluate(() => {
    window.downloaded = window.downloaded ||= new Set();
    const images = document.querySelectorAll(
      'article img[src^="https://preview.redd.it"]'
    );

    const newSet = new Set(
      [...images]
        .map((image) => image.src)
        .filter((url) => !window.downloaded.has(url))
    );

    return Array.from(newSet);
  });

  for (const url of newUrls) {
    const { pathname } = new URL(url);

    const fileName = pathname.replace(/.*[\\\/]([^\\\/]+)/, '$1');
    if (existing.has(fileName)) {
      continue;
    }

    console.log(`Downloading: ${fileName}`);
    const result = await fetch(url);

    await uploadFile({
      file: {
        path: `${args.real ? 'human' : 'artificial'}/${fileName}`,
        content: await result.blob(),
      },
      repo: { name: 'haywoodsloan/ai-images', type: 'dataset' },
      credentials: { accessToken: hfKey },
    });

    count++;
    if (count >= args.count) {
      break;
    }
  }

  await page.evaluate(
    (height, newUrls) => {
      newUrls.forEach((url) => window.downloaded.add(url));
      window.scrollBy(0, height);
    },
    page.viewport().height,
    newUrls
  );
}

console.log('Done!');
