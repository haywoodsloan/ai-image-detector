import { app } from '@azure/functions';
import { isProd } from 'common/utilities/environment.js';
import { l } from 'common/utilities/string.js';
import { validate as validateEmail } from 'email-validator';

import { PendingVerification, insertNewAuth } from '../services/db/authColl.js';
import { insertNewUser, queryUserByEmail } from '../services/db/userColl.js';
import { createErrorResponse } from '../utilities/error.js';
import { captureConsole } from '../utilities/log.js';
import { sendVerificationMail } from '../services/email/email.js';

app.http('createAuth', {
  methods: ['POST'],
  authLevel: isProd ? 'anonymous' : 'function',
  handler: async (request, context) => {
    captureConsole(context);

    /** @type {{email: string}} */
    const { email } = await request.json();

    // Check the email is valid
    if (!validateEmail(email)) {
      const error = new Error('Must specify a valid email address');
      console.error(error);
      return createErrorResponse(400, error);
    }

    // Get the existing user or create a new one
    let user = await queryUserByEmail(email);
    console.log('got user', user);
    if (!user) {
      console.log(l`Creating a new user ${{ email }}`);
      user = await insertNewUser(email);
    }

    // Create a new auth for the user
    const auth = await insertNewAuth(user._id);
    console.log(
      l`Created a new auth ${{
        userId: auth.userId,
        authId: auth._id,
      }}`
    );

    // If the auth verification is pending send an email
    if (auth.verification.status === PendingVerification) {
      // TODO send verification email if verification is pending
      console.log(l`Sending verification email ${{ email, authId: auth._id }}`);
      await sendVerificationMail(email, auth.verification.code)
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
