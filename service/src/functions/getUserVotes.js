import { app } from '@azure/functions';
import { isProd } from 'common/utilities/environment.js';
import { l } from 'common/utilities/string.js';

import { queryVotesByUser } from '../services/db/voteColl.js';
import { assertValidAuth } from '../utilities/auth.js';
import { createErrorResponse } from '../utilities/error.js';

app.http('getUserVotes', {
  methods: ['GET'],
  authLevel: isProd ? 'anonymous' : 'function',
  handler: async (request, context) => {
    // Check the access token is valid
    let userId;
    try {
      userId = await assertValidAuth(request);
    } catch (error) {
      context.error(error);
      return createErrorResponse(401, error);
    }

    const votes = await queryVotesByUser(userId);
    context.log(l`User votes ${{ userId, voteCount: votes.length }}`);
    return { jsonBody: votes };
  },
});
