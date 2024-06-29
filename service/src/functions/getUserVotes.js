import { app } from '@azure/functions';
import { l } from 'common/utilities/string.js';

import { queryVotesByUser } from '../services/db/voteColl.js';
import { assertValidAuth } from '../utilities/auth.js';
import { createErrorResponse } from '../utilities/error.js';
import { captureConsole } from '../utilities/log.js';

app.http('getUserVotes', {
  methods: ['GET'],
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

    const votes = await queryVotesByUser(userId);
    console.log(l`User votes ${{ userId, voteCount: votes.length }}`);
    return { jsonBody: votes };
  },
});
