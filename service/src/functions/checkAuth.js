import { app } from '@azure/functions';
import TimeSpan from 'common/utilities/TimeSpan.js';
import { l } from 'common/utilities/string.js';

import { PendingVerification, queryAuth } from '../services/db/authColl.js';
import { getValidationSocketUrl } from '../services/pubsub.js';
import { assertAccessToken } from '../utilities/auth.js';
import { createErrorResponse } from '../utilities/error.js';
import { captureConsole } from '../utilities/log.js';

app.http('checkAuth', {
  methods: ['GET'],
  authLevel: 'anonymous',
  handler: async (request, context) => {
    captureConsole(context);

    // Check if an access token was specified
    let accessToken;
    try {
      accessToken = assertAccessToken(request);
    } catch (error) {
      console.error(error);
      return createErrorResponse(400, error);
    }

    // Get an existing auth if one exists
    const auth = await queryAuth(accessToken);
    if (!auth) {
      const error = new Error('Access token has expired');
      console.error(error);
      return createErrorResponse(401, error);
    }

    console.log(
      l`Got existing auth ${{
        userId: auth.userId,
        verifyStatus: auth.verifyStatus,
      }}`
    );

    // Start the base response
    const response = {
      authId: auth._id,
      userId: auth.userId,
      verification: auth.verifyStatus,
      expiresAt: new Date(
        auth.refreshedAt.getTime() + TimeSpan.fromSeconds(auth.ttl)
      ),
    };

    // If not verified create a socket
    if (auth.verifyStatus === PendingVerification) {
      console.log(`Getting validation socket ${{ userId: auth.userId }}`);
      response.validationSocket = await getValidationSocketUrl(auth.userId);
    }

    // Get a validation socket for the user
    return { jsonBody: response };
  },
});
