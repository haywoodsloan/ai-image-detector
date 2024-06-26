import { app } from '@azure/functions';
import { l } from 'common/utilities/string.js';

import { verifyAuth } from '../services/db/authColl.js';
import { createErrorResponse } from '../utilities/error.js';
import { captureConsole } from '../utilities/log.js';

app.http('verifyAuth', {
  methods: ['GET'],
  authLevel: 'anonymous',
  handler: async (request, context) => {
    captureConsole(context);

    const code = request.query.get('code');
    if (!code) {
      const error = new Error('Must specify a verification code');
      console.error(error);
      return createErrorResponse(400, error);
    }

    const auth = await verifyAuth(code);
    if (!auth) {
      const error = new Error('Verification code is no longer valid');
      console.error(error);
      return { status: 400, body: error.message };
    }

    console.log(l`Verified auth ${{ userId: auth.userId, authId: auth._id }}`);
    return { body: 'Verification successful, this page can now be closed' };
  },
});
