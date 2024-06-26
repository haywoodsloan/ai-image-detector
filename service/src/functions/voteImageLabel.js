import { app } from '@azure/functions';
import { isProd } from 'common/utilities/environment.js';
import { hashImage } from 'common/utilities/hash.js';
import {
  AllLabels,
  TrainSplit,
  replaceImage,
  uploadImages,
} from 'common/utilities/huggingface.js';
import { getImageData, sanitizeImage } from 'common/utilities/image.js';
import { l } from 'common/utilities/string.js';
import { isHttpUrl } from 'common/utilities/url.js';
import { extname } from 'path';
import sanitizeFileName from 'sanitize-filename';

import { queryVotedLabel, upsertVotedLabel } from '../services/db/voteColl.js';
import { assertValidAuth } from '../utilities/auth.js';
import { createErrorResponse } from '../utilities/error.js';
import { captureConsole } from '../utilities/log.js';

const PendingBranch = 'pending';

app.http('voteImageLabel', {
  methods: ['POST'],
  authLevel: isProd ? 'anonymous' : 'function',
  handler: async (request, context) => {
    captureConsole(context);

    /** @type {{url: string, voteLabel: string}} */
    const { url, voteLabel } = await request.json();

    // Check the url is valid
    if (!isHttpUrl(url)) {
      const error = new Error('Must specify a valid URL');
      console.error(error);
      return createErrorResponse(400, error);
    }

    // Check the vote is valid
    if (!AllLabels.includes(voteLabel)) {
      const error = new Error(l`voteLabel must be one of ${AllLabels}`);
      console.error(error);
      return createErrorResponse(400, error);
    }

    // Check the access token is valid
    let userId;
    try {
      userId = await assertValidAuth(request);
    } catch (error) {
      console.error(error);
      return createErrorResponse(401, error);
    }

    // Track the vote by the image's hash
    console.log(l`Vote image ${{ url, userId, voteLabel }}`);
    const data = await getImageData(url);
    const hash = hashImage(data);

    // Check what the current voted label is
    const oldLabel = await queryVotedLabel(hash);
    const vote = await upsertVotedLabel(hash, userId, voteLabel);

    // Check if the voted label has changed and upload if so
    const newLabel = await queryVotedLabel(hash);
    if (newLabel && oldLabel !== newLabel) {
      console.log(l`Voted label changed, uploading ${{ url }}`);
      upload(data, url, newLabel);
    }

    return { jsonBody: vote };
  },
});

/**
 * @param {Buffer} data
 * @param {string | URL} url
 * @param {string} label
 */
async function upload(data, url, label) {
  // Sanitize the image first
  try {
    data = await sanitizeImage(data);
  } catch (error) {
    console.warn(l`Image validation failed ${{ url, error }}`);
    return;
  }

  // Use the hash of the sanitized image to store it
  const hash = hashImage(data);
  const { pathname } = new URL(url);
  const ext = extname(pathname);

  // Build the image properties, always use the train split
  const fileName = sanitizeFileName(`${hash}${ext}`);
  const split = TrainSplit;
  const content = new Blob([data]);
  const origin = new URL(url);

  /** @type {HfImage} */
  const image = { fileName, label, split, content, origin };
  try {
    // If an existing image either replace ir or skip the image (if label is the same)
    (await replaceImage(image, PendingBranch))
      ? console.log(l`Image replaced on Hugging Face ${{ fileName, label }}`)
      : console.log(l`Matching image on Hugging Face ${{ fileName, label }}`);
  } catch {
    // If replace errors then it's a new file to upload
    await uploadImages([image], PendingBranch);
    console.log(l`Image uploaded to Hugging Face ${{ fileName, label }}`);
  }
}
