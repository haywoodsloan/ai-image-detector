import { app } from '@azure/functions';

import { queryUser } from '../services/db/userColl.js';
import { checkIfAI } from '../services/detector.js';
import { getImageData } from '../utilities/image.js';
import { isHttpUrl } from '../utilities/url.js';

app.http('checkImage', {
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: async (request, context) => {
    const { url, userId } = await request.json();
    if (!isHttpUrl(url)) {
      const error = new Error('Must specify a valid URL');
      context.error(error);
      return { status: 400, jsonBody: { error: error.message } };
    }

    const user = await queryUser(userId);
    if (!user) {
      const error = new Error('Must specify a valid UserID');
      context.error(error);
      return { status: 400, jsonBody: { error: error.message } };
    }

    context.log(`Checking image at: ${url}, for user ID: ${user.userId}`);
    const data = await getImageData(url);
    const artificial = await checkIfAI(data);

    context.log(`Artificial score: ${artificial}`);
    return { jsonBody: { artificial } };
  },
});
