import { app } from '@azure/functions';
import { ImageValidationQueue } from 'common/utilities/ImageValidationQueue.js';
import {
  AllLabels,
  TrainSplit,
  getPathForImage,
  isExistingImage,
  releaseImagePath,
  uploadWithRetry,
} from 'common/utilities/huggingface.js';
import { extname } from 'path';
import sanitize from 'sanitize-filename';

import { queryUser } from '../services/db/userColl.js';
import { queryVotedClass, upsertVotedClass } from '../services/db/voteColl.js';
import { createErrorResponse } from '../utilities/error.js';
import { hashImage } from '../utilities/hash.js';
import { getImageData } from '../utilities/image.js';
import { l } from '../utilities/string.js';
import { isHttpUrl } from '../utilities/url.js';

const PendingBranch = 'pending';

app.http('voteImageClass', {
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: async (request, context) => {
    /** @type {{url: string, userId: string, voteClass: string}} */
    const { url, userId, voteClass } = await request.json();

    if (!isHttpUrl(url)) {
      const error = new Error('Must specify a valid URL');
      context.error(error);
      return createErrorResponse(400, error);
    }

    if (!AllLabels.includes(voteClass)) {
      const error = new Error(l`voteClass must be one of: ${AllLabels}`);
      context.error(error);
      return createErrorResponse(400, error);
    }

    const user = await queryUser(userId);
    if (!user) {
      const error = new Error('Must specify a valid UserID');
      context.error(error);
      return createErrorResponse(400, error);
    }

    context.log(l`Vote image ${{ url, userId, voteClass }}`);
    const data = await getImageData(url);
    const hash = hashImage(data);
    const vote = await upsertVotedClass(hash, userId, { voteClass });

    const { pathname } = new URL(url);
    const ext = extname(pathname);
    uploadIfEnoughVotes(data, hash, ext);

    return { jsonBody: vote };
  },
});

/**
 * @param {Buffer} data
 * @param {string} hash
 * @param {string} ext
 */
async function uploadIfEnoughVotes(data, hash, ext) {
  const voteClass = await queryVotedClass(hash);
  if (!voteClass) {
    console.log(l`Not enough votes for upload ${{ hash }}`);
    return;
  }

  const fileName = sanitize(`${hash}.${ext}`);
  if (await isExistingImage(fileName, PendingBranch)) {
    console.log(l`Image already exists ${{ fileName }}`);
    return;
  }

  const validator = await ImageValidationQueue.createQueue();
  const uploadPath = await getPathForImage(
    TrainSplit,
    voteClass,
    fileName,
    PendingBranch
  );

  validator
    .queueValidation({ path: uploadPath, content: data })
    .then((isValid) => {
      if (!isValid) releaseImagePath(uploadPath);
    });

  const validated = await validator.getValidated();
  if (!validated.length) {
    console.warn(l`Image validation failed ${{ fileName }}`);
    return;
  }

  await uploadWithRetry(validated, PendingBranch);
  console.log(l`Image uploaded to Hugging Face ${{ file: uploadPath }}`);
}
