import { app } from '@azure/functions';
import { createHash } from 'common/utilities/hash.js';
import { AiLabel } from 'common/utilities/huggingface.js';
import { getImageData } from 'common/utilities/image.js';
import { l } from 'common/utilities/string.js';
import { isHttpUrl } from 'common/utilities/url.js';

import { queryVotedLabel } from '../services/db/voteColl.js';
import { classifyIfAi } from '../services/detector.js';
import { assertValidAuth } from '../utilities/auth.js';
import { createErrorResponse } from '../utilities/error.js';
import { captureConsole } from '../utilities/log.js';

app.http('checkImage', {
  methods: ['POST'],
  authLevel: 'anonymous',
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

    // Check for a voted class from the DB
    const hash = createHash(data, { alg: 'sha256' });
    const voted = await queryVotedLabel(hash);

    // If a voted class exists return it and the vote count
    if (voted) {
      console.log(l`Voted label ${voted}`);
      const artificial = voted.label === AiLabel ? 1 : 0;
      return { jsonBody: { artificial, voteCount: voted.count } };
    }

    // Get the AI classification score
    const artificial = await classifyIfAi(data);
    console.log(l`Detector result ${{ artificial }}`);
    return { jsonBody: { artificial } };
  },
});
