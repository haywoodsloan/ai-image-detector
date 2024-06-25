import { app } from '@azure/functions';
import { isProd } from 'common/utilities/environment.js';
import { getImageData } from 'common/utilities/image.js';
import { l } from 'common/utilities/string.js';
import { isHttpUrl } from 'common/utilities/url.js';

import { checkIfAI } from '../services/detector.js';
import { assertValidAuth } from '../utilities/auth.js';
import { createErrorResponse } from '../utilities/error.js';

app.http('checkImage', {
  methods: ['POST'],
  authLevel: isProd ? 'anonymous' : 'function',
  handler: async (request, context) => {
    /** @type {{url: string}} */
    const { url } = await request.json();

    // Check url is valid
    if (!isHttpUrl(url)) {
      const error = new Error('Must specify a valid URL');
      context.error(error);
      return createErrorResponse(400, error);
    }

    // Check the access token is valid
    try {
      const userId = await assertValidAuth(request);
      context.log(l`Checking image ${{ url, userId }}`);
    } catch (error) {
      context.error(error);
      createErrorResponse(401, error);
    }

    // Get the image data
    let data;
    try {
      data = await getImageData(url);
    } catch (error) {
      context.error(error);
      return createErrorResponse(400, error);
    }

    // Get the AI classification score
    const artificial = await checkIfAI(data);
    context.log(l`Result ${{ artificial }}`);
    return { jsonBody: { artificial } };
  },
});
