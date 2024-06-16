import { app } from '@azure/functions';

import { queryUser } from '../services/db/userColl.js';
import { queryVotesByUser } from '../services/db/voteColl.js';
import { createErrorResponse } from '../utilities/error.js';
import { l } from '../utilities/string.js';

app.http('getUserVotes', {
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: async (request, context) => {
    const { userId } = await request.json();

    // Check the user is valid
    const user = await queryUser(userId);
    if (!user) {
      const error = new Error('Must specify a valid UserID');
      context.error(error);
      return createErrorResponse(400, error);
    }

    const votes = await queryVotesByUser(userId);
    context.log(l`User votes ${{ userId, voteCount: votes.length }}`);
    return { jsonBody: votes };
  },
});
