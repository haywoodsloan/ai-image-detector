import { app } from '@azure/functions';
import { createHash } from 'common/utilities/hash.js';
import { AllLabels } from 'common/utilities/huggingface.js';
import { getImageData, normalizeImage } from 'common/utilities/image.js';
import { l } from 'common/utilities/string.js';
import { isDataUrl, isHttpUrl, shortenUrl } from 'common/utilities/url.js';
import { EntityId, getClient, input } from 'durable-functions';

import { queryVotedLabel, upsertVotedLabel } from '../services/db/voteColl.js';
import { assertValidAuth } from '../utilities/auth.js';
import { createErrorResponse } from '../utilities/error.js';
import { captureConsole } from '../utilities/log.js';
import { UploadImageEntity } from './uploadImage.js';

app.http('voteImageLabel', {
  methods: ['POST', 'OPTIONS'],
  authLevel: 'anonymous',
  extraInputs: [input.durableClient()],
  handler: async (request, context) => {
    captureConsole(context);

    // Check the access token is valid
    let userId;
    try {
      userId = await assertValidAuth(request);
    } catch (error) {
      console.error(error);
      return createErrorResponse(401, error);
    }

    /** @type {{url: string, voteLabel: string, skipUpload?: boolean}} */
    const { url, voteLabel, skipUpload = false } = await request.json();

    // Check the url is valid
    if (!isHttpUrl(url) && !isDataUrl(url)) {
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

    // Get the image data
    let data;
    try {
      data = await getImageData(url);
    } catch (error) {
      console.error(error);
      return createErrorResponse(404, error);
    }

    // Track the vote by the image's hash
    console.log(l`Vote image ${{ url: shortenUrl(url), userId, voteLabel }}`);
    const hash = createHash(await normalizeImage(data), { alg: 'sha256' });

    // Add the vote and check the new label
    const vote = await upsertVotedLabel(hash, userId, voteLabel);
    const { voteLabel: newLabel } = (await queryVotedLabel(hash)) ?? {};
    console.log(l`New voted label ${{ hash, label: newLabel }}`);

    // Check if the voted label has changed and upload if so
    // Skip upload if requested in vote
    if (skipUpload && newLabel) {
      console.log(l`Skip upload requested ${{ url: shortenUrl(url) }}`);
    } else {
      const entityId = new EntityId(UploadImageEntity, hash);
      const options = { data, ...(isHttpUrl(url) && { url }), label: newLabel };
      await getClient(context).signalEntity(entityId, null, options);
    }

    return { jsonBody: vote };
  },
});
