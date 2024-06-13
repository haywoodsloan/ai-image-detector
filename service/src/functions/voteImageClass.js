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

    if (!isHttpUrl(url)) {
      const error = new Error('Must specify a valid URL');
      context.error(error);
      return createErrorResponse(400, error);
    }

    if (!AllLabels.includes(voteLabel)) {
      const error = new Error(l`voteLabel must be one of: ${AllLabels}`);
      context.error(error);
      return createErrorResponse(400, error);
    }

    const user = await queryUserById(userId);
    if (!user) {
      const error = new Error('Must specify a valid UserID');
      context.error(error);
      return createErrorResponse(400, error);
    }

    context.log(l`Vote image ${{ url, userId, voteLabel }}`);
    const data = await getImageData(url);
    const hash = hashImage(data);

    const oldLabel = await queryVotedLabel(hash);
    const vote = await upsertVotedLabel(hash, userId, { voteLabel });

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
  try {
    data = await sanitizeImage(data);
  } catch (error) {
    console.warn(l`Image validation failed ${{ url, error }}`);
    return;
  }

  const hash = hashImage(data);
  const { pathname } = new URL(url);
  const ext = extname(pathname);

  const fileName = sanitize(`${hash}${ext}`);
  const uploadPath = await getPathForImage(TrainSplit, label, fileName, {
    branch: PendingBranch,
    skipCache: true,
  });

  const upload = { path: uploadPath, content: new Blob([data]) };
  if (
    await isExistingImage(fileName, { branch: PendingBranch, skipCache: true })
  ) {
    (await replaceWithRetry(upload, PendingBranch))
      ? console.log(l`Image replaced on Hugging Face ${{ file: uploadPath }}`)
      : console.log(l`Matching image on Hugging Face ${{ file: uploadPath }}`);
    return;
  }

  await uploadWithRetry([upload], PendingBranch);
  console.log(l`Image uploaded to Hugging Face ${{ file: uploadPath }}`);
}
