import { app } from '@azure/functions';
import { isProd } from 'common/utilities/environment.js';
import { getImageData } from 'common/utilities/image.js';
import { l } from 'common/utilities/string.js';
import { isHttpUrl } from 'common/utilities/url.js';

import { checkIfAI } from '../services/detector.js';
import { assertValidAuth } from '../utilities/auth.js';
import { createErrorResponse } from '../utilities/error.js';
import { captureConsole } from '../utilities/log.js';

app.http('checkImage', {
  methods: ['POST'],
  authLevel: isProd ? 'anonymous' : 'function',
  handler: async (request, context) => {
    captureConsole(context);

    /** @type {{url: string}} */
    const { url } = await request.json();

    // Check url is valid
    if (!isHttpUrl(url)) {
      const error = new Error('Must specify a valid URL');
      console.error(error);
      return createErrorResponse(400, error);
    }

    // Check the access token is valid
    try {
      const userId = await assertValidAuth(request);
      console.log(l`Checking image ${{ url, userId }}`);
    } catch (error) {
      console.error(error);
      return createErrorResponse(401, error);
    }

    // Get the image data
    let data;
    try {
      data = await getImageData(url);
    } catch (error) {
      console.error(error);
      return createErrorResponse(404, error);
    }

    // Get the AI classification score
    const artificial = await checkIfAI(data);
    console.log(l`Result ${{ artificial }}`);
    return { jsonBody: { artificial } };
  },
});
