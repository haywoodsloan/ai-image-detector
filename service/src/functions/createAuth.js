import { app } from '@azure/functions';
import { isProd } from 'common/utilities/environment.js';
import { l } from 'common/utilities/string.js';
import { validate as validateEmail } from 'email-validator';

import { PendingVerification, insertNewAuth } from '../services/db/authColl.js';
import { insertNewUser, queryUserByEmail } from '../services/db/userColl.js';
import { createErrorResponse } from '../utilities/error.js';

app.http('createAuth', {
  methods: ['POST'],
  authLevel: isProd ? 'anonymous' : 'function',
  handler: async (request, context) => {
    /** @type {{email: string}} */
    const { email } = await request.json();

    // Check the email is valid
    if (!validateEmail(email)) {
      const error = new Error('Must specify a valid email address');
      context.error(error);
      return createErrorResponse(400, error);
    }

    // Get the existing user or create a new one
    let user = await queryUserByEmail(email);
    if (!user) {
      context.log(l`Creating a new user ${{ email }}`);
      user = await insertNewUser(email);
    }

    // Create a new auth for the user
    const auth = await insertNewAuth(user._id);
    context.log(
      l`Created a new auth ${{
        userId: auth.userId,
        authId: auth._id,
      }}`
    );

    // If the auth verification is pending send an email
    if (auth.verification.status === PendingVerification) {
      // TODO send verification email if verification is pending
      context.log(l`Sending verification email ${{ email, authId: auth._id }}`);
    }

    // Only return the accessToken and userId
    return {
      jsonBody: {
        accessToken: auth.accessToken,
        expiresAt: auth.expiresAt,
        userId: auth.userId,
      },
    };
  },
});
