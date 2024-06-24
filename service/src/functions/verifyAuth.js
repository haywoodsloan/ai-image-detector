import { app } from '@azure/functions';
import { isProd } from 'common/utilities/environment.js';
import { l } from 'common/utilities/string.js';
import { validate } from 'email-validator';

import { verifyAuth } from '../services/db/authColl.js';
import { createErrorResponse } from '../utilities/error.js';

app.http('verifyAuth', {
  methods: ['GET'],
  authLevel: isProd ? 'anonymous' : 'function',
  handler: async (request, context) => {
    const email = request.query.get('email');
    if (!validate(email)) {
      const error = new Error('Must specify a valid email address');
      context.error(error);
      return createErrorResponse(400, error);
    }

    const code = request.query.get('code');
    if (!code) {
      const error = new Error('Must specify a verification code');
      context.error(error);
      return createErrorResponse(400, error);
    }

    const auth = await verifyAuth(code);
    if (!auth) {
      const error = new Error('Verification code is no longer valid');
      context.error(error);
      return createErrorResponse(400, error);
    }

    context.log(l`Verified auth ${{ userId: auth.userId, authId: auth._id }}`);
  },
});
