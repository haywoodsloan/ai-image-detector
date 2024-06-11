import { app } from '@azure/functions';
import { ImageValidationQueue } from 'common/utilities/ImageValidationQueue.js';
import { hashImage } from 'common/utilities/hash.js';
import {
  AllLabels,
  TrainSplit,
  getPathForImage,
  isExistingImage,
  releaseImagePath,
  replaceWithRetry,
  uploadWithRetry,
} from 'common/utilities/huggingface.js';
import { getImageData } from 'common/utilities/image.js';
import { extname } from 'path';
import sanitize from 'sanitize-filename';

import { queryUser } from '../services/db/userColl.js';
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

    const user = await queryUser(userId);
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
      console.log(l`Voted label changed, uploading ${{ hash }}`);

      const { pathname } = new URL(url);
      const ext = extname(pathname);

      upload(data, newLabel, hash, ext);
    }

    return { jsonBody: vote };
  },
});

/**
 * @param {Buffer} data
 * @param {string} label
 * @param {string} hash
 * @param {string} ext
 */
async function upload(data, label, hash, ext) {
  const fileName = sanitize(`${hash}${ext}`);
  const uploadPath = await getPathForImage(TrainSplit, label, fileName, {
    branch: PendingBranch,
    skipCache: true,
  });

  const validator = await ImageValidationQueue.createQueue();
  validator
    .queueValidation({ path: uploadPath, content: data })
    .then((isValid) => {
      if (!isValid) releaseImagePath(uploadPath);
    });

  const [validated] = await validator.getValidated();
  if (!validated) {
    console.warn(l`Image validation failed ${{ fileName }}`);
    return;
  }

  if (
    await isExistingImage(fileName, { branch: PendingBranch, skipCache: true })
  ) {
    (await replaceWithRetry(validated, PendingBranch))
      ? console.log(l`Image replaced on Hugging Face ${{ file: uploadPath }}`)
      : console.log(l`Matching image on Hugging Face ${{ file: uploadPath }}`);
    return;
  }

  await uploadWithRetry([validated], PendingBranch);
  console.log(l`Image uploaded to Hugging Face ${{ file: uploadPath }}`);
}
