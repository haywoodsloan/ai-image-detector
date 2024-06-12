import { app } from '@azure/functions';
import { getImageData } from 'common/utilities/image.js';

import { queryUser } from '../services/db/userColl.js';
import { checkIfAI } from '../services/detector.js';
import { createErrorResponse } from '../utilities/error.js';
import { l } from '../utilities/string.js';
import { isHttpUrl } from '../utilities/url.js';

app.http('checkImage', {
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: async (request, context) => {
    /** @type {{url: string, userId: string}} */
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

    context.log(l`Checking image ${{ url, userId }}`);
    const data = await getImageData(url);
    const artificial = await checkIfAI(data);

    context.log(l`Result ${{ artificial }}`);
    return { jsonBody: { artificial } };
  },
});
