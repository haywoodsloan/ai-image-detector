import { app } from '@azure/functions';
import TimeSpan from 'common/utilities/TimeSpan.js';
import { isDev, isLocal } from 'common/utilities/environment.js';
import { createHash } from 'common/utilities/hash.js';
import { l } from 'common/utilities/string.js';
import { validate as validateEmail } from 'email-validator';

import { PendingVerification, insertNewAuth } from '../services/db/authColl.js';
import { insertNewUser, queryUserByEmail } from '../services/db/userColl.js';
import { sendVerificationMail } from '../services/email.js';
import { getValidationSocketUrl } from '../services/pubsub.js';
import { createErrorResponse } from '../utilities/error.js';
import { captureConsole } from '../utilities/log.js';

app.http('createAuth', {
  methods: ['POST'],
  authLevel: 'anonymous',
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

    // Use a hash of the email to track the user for privacy
    const emailHash = createHash(email, { alg: 'sha256' });

    // Get the existing user or create a new one
    let user = await queryUserByEmail(emailHash);
    if (!user) {
      console.log(l`Creating a new user ${{ emailHash }}`);
      user = await insertNewUser(emailHash);
      console.log(l`Created new user ${{ userId: user._id }}`);
    }

    // Auto verify if local or dev and SkipVerify header is specified
    const verified = (isLocal || isDev) && request.headers.get('SkipVerify');
    console.log(l`Initial verification status ${{ verified }}`);

    console.log(l`Creating a new auth ${{ userId: user._id }}`);
    const auth = await insertNewAuth(user._id, verified);
    console.log(
      l`Created a new auth ${{
        userId: auth.userId,
        authId: auth._id,
      }}`
    );

    // If the auth verification is pending send an email
    let validationSocket;
    if (auth.verifyStatus === PendingVerification) {
      console.log(l`Emailing verification ${{ emailHash, authId: auth._id }}`);
      await sendVerificationMail(email, auth.verifyCode);

      console.log(l`Getting validation socket URL ${{ userId: auth.userId }}`);
      validationSocket = await getValidationSocketUrl(auth.userId);
    }

    // Only return the accessToken and userId
    return {
      jsonBody: {
        validationSocket,
        authId: auth._id,
        userId: auth.userId,
        accessToken: auth.accessToken,
        verification: auth.verifyStatus,
        expiresAt: new Date(
          auth.refreshedAt.getTime() + TimeSpan.fromSeconds(auth.ttl)
        ),
      },
    };
  },
});
