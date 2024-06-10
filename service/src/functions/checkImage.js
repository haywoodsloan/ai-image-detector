import { app } from '@azure/functions';

import { queryUser } from '../services/db/userColl.js';
import { checkIfAI } from '../services/detector.js';
import { getImageData } from '../utilities/image.js';
import { isHttpUrl } from '../utilities/url.js';
import { createErrorResponse } from '../utilities/error.js';

app.http('checkImage', {
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: async (request, context) => {
    const { url, userId } = await request.json();
    if (!isHttpUrl(url)) {
      const error = new Error('Must specify a valid URL');
      context.error(error);
      return createErrorResponse(400, error);
    }

    const user = await queryUser(userId);
    if (!user) {
      const error = new Error('Must specify a valid UserID');
      context.error(error);
      return createErrorResponse(400, error);
    }

    context.log(`Checking image (Url=${url}, UserId=${user.userId})`);
    const data = await getImageData(url);
    const artificial = await checkIfAI(data);

    context.log(`Result (Score=${artificial})`);
    return { jsonBody: { artificial } };
  },
});
