import { app } from '@azure/functions';
import { createHash } from 'common/utilities/hash.js';
import { getImageData, normalizeImage } from 'common/utilities/image.js';
import { l } from 'common/utilities/string.js';
import { isDataUrl, isHttpUrl, shortenUrl } from 'common/utilities/url.js';

import { deleteVote } from '../services/db/voteColl.js';
import { assertValidAuth } from '../utilities/auth.js';
import { createErrorResponse } from '../utilities/error.js';
import { captureConsole } from '../utilities/log.js';

app.http('deleteImageVote', {
  methods: ['POST'],
  authLevel: 'anonymous',
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

    /** @type {{url: string}} */
    const { url } = await request.json();

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

    return { status: 204 };
  },
});
