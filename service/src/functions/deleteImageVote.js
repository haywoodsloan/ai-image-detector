import { app } from '@azure/functions';
import { createHash } from 'common/utilities/hash.js';
import { getImageData, normalizeImage } from 'common/utilities/image.js';
import { l } from 'common/utilities/string.js';
import { isDataUrl, isHttpUrl, shortenUrl } from 'common/utilities/url.js';
import { EntityId, getClient, input } from 'durable-functions';

import { deleteVote, queryVotedLabel } from '../services/db/voteColl.js';
import { assertValidAuth } from '../utilities/auth.js';
import { createErrorResponse } from '../utilities/error.js';
import { captureConsole } from '../utilities/log.js';
import { UploadImageEntity } from './uploadImage.js';

const methods = ['POST', 'OPTIONS'];
app.http('deleteImageVote', {
  methods,
  authLevel: 'anonymous',
  extraInputs: [input.durableClient()],
  
  handler: async (request, context) => {
    captureConsole(context);
    if (request.method === 'OPTIONS') {
      console.log(l`OPTIONS request ${{ methods }}`);
      return { status: 200, headers: { Allow: methods } };
    }

    // Check the access token is valid
    let userId;
    try {
      userId = await assertValidAuth(request);
    } catch (error) {
      console.error(error);
      return createErrorResponse(401, error);
    }

    /** @type {{url: string, skipUpload?: boolean}} */
    const { url, skipUpload = false } = await request.json();

    // Check the url is valid
    if (!isHttpUrl(url) && !isDataUrl(url)) {
      const error = new Error('Must specify a valid URL');
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
    const hash = createHash(await normalizeImage(data), { alg: 'sha256' });

    // Delete the vote if it exists
    console.log(l`Delete vote ${{ url: shortenUrl(url), userId }}`);
    await deleteVote(userId, hash);

    // Check if the label changed
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

    return { status: 204 };
  },
});
