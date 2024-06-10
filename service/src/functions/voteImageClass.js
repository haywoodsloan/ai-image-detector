import { app } from '@azure/functions';
import { ImageValidationQueue } from 'common/utilities/ImageValidationQueue.js';
import {
  AllLabels,
  TrainSplit,
  getPathForImage,
  isExistingImage,
} from 'common/utilities/huggingface.js';
import sanitize from 'sanitize-filename';

import { queryUser } from '../services/db/userColl.js';
import { queryVotedClass, upsertVotedClass } from '../services/db/voteColl.js';
import { createErrorResponse } from '../utilities/error.js';
import { hashImage } from '../utilities/hash.js';
import { getImageData } from '../utilities/image.js';
import { logObject } from '../utilities/string.js';
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
      const labels = AllLabels.join(', ');
      const error = new Error(`voteClass must be one of: [${labels}]`);
      context.error(error);
      return createErrorResponse(400, error);
    }

    const user = await queryUser(userId);
    if (!user) {
      const error = new Error('Must specify a valid UserID');
      context.error(error);
      return createErrorResponse(400, error);
    }

    context.log(`Vote image ${logObject({ url, userId, voteClass })}`);
    const data = await getImageData(url);
    const hash = hashImage(data);

    const vote = await upsertVotedClass(hash, userId, { voteClass });
    uploadIfEnoughVotes(data, hash, context);

    return { jsonBody: vote };
  },
});

/**
 * @param {Buffer} data
 * @param {string} hash
 * @param {InvocationContext} context
 */
async function uploadIfEnoughVotes(data, hash, context) {
  const voteClass = await queryVotedClass(hash);
  if (!voteClass) {
    context.log('Not enough votes for upload');
    return;
  }

  const fileName = sanitize(hash);
  if (await isExistingImage(fileName, PendingBranch)) {
    context.log('Image already exists');
    return;
  }

  const validator = await ImageValidationQueue.createQueue();
  const uploadPath = await getPathForImage(
    TrainSplit,
    voteClass,
    fileName,
    PendingBranch
  );

  validator.queueValidation({ path: uploadPath, content: data });
  const validated = await validator.getValidated();

  if (!validated.length) {
    context.warn(`Image validation failed ${logObject({ fileName })}`);
    return;
  }

  // TODO finish upload
}
