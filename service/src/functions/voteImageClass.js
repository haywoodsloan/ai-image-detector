import { app } from '@azure/functions';
import { hashImage } from 'common/utilities/hash.js';
import {
  AllLabels,
  TrainSplit,
  getPathForImage,
  isExistingImage,
  replaceWithRetry,
  uploadWithRetry,
} from 'common/utilities/huggingface.js';
import { getImageData, sanitizeImage } from 'common/utilities/image.js';
import { extname } from 'path';
import sanitize from 'sanitize-filename';

import { queryUserById } from '../services/db/userColl.js';
import { queryVotedLabel, upsertVotedLabel } from '../services/db/voteColl.js';
import { createErrorResponse } from '../utilities/error.js';
import { l } from '../utilities/string.js';
import { isHttpUrl } from '../utilities/url.js';

const PendingBranch = 'pending';

app.http('voteImageLabel', {
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: async (request, context) => {
    /** @type {{url: string, userId: string, voteLabel: string}} */
    const { url, userId, voteLabel } = await request.json();

    // Check the url is valid
    if (!isHttpUrl(url)) {
      const error = new Error('Must specify a valid URL');
      context.error(error);
      return createErrorResponse(400, error);
    }

    // Check the vote is valid
    if (!AllLabels.includes(voteLabel)) {
      const error = new Error(l`voteLabel must be one of: ${AllLabels}`);
      context.error(error);
      return createErrorResponse(400, error);
    }

    // Check the user is valid
    const user = await queryUserById(userId);
    if (!user) {
      const error = new Error('Must specify a valid UserID');
      context.error(error);
      return createErrorResponse(400, error);
    }

    // Track the vote by the image's hash
    context.log(l`Vote image ${{ url, userId, voteLabel }}`);
    const data = await getImageData(url);
    const hash = hashImage(data);

    // Check what the current voted label is
    const oldLabel = await queryVotedLabel(hash);
    const vote = await upsertVotedLabel(hash, userId, { voteLabel });

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

  // Get an available upload path for the new image
  const fileName = sanitize(`${hash}${ext}`);
  const uploadPath = await getPathForImage(TrainSplit, label, fileName, {
    branch: PendingBranch,
    skipCache: true,
  });

  const upload = { path: uploadPath, content: new Blob([data]) };
  const isExisting = await isExistingImage(fileName, {
    branch: PendingBranch,
    skipCache: true,
  });

  if (isExisting) {
    // If an existing image either replace ir or skip the image (if label is the same)
    (await replaceWithRetry(upload, PendingBranch))
      ? console.log(l`Image replaced on Hugging Face ${{ file: uploadPath }}`)
      : console.log(l`Matching image on Hugging Face ${{ file: uploadPath }}`);
    return;
  }

  // If a new image just upload it
  await uploadWithRetry([upload], PendingBranch);
  console.log(l`Image uploaded to Hugging Face ${{ file: uploadPath }}`);
}
