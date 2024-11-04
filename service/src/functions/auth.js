import { app } from '@azure/functions';
import TimeSpan from 'common/utilities/TimeSpan.js';
import { isDev, isLocal } from 'common/utilities/environment.js';
import { createHash } from 'common/utilities/hash.js';
import { l } from 'common/utilities/string.js';
import { validate as validateEmail } from 'email-validator';

import { queryAuth } from '../services/db/authColl.js';
import { PendingVerification, insertNewAuth } from '../services/db/authColl.js';
import { insertNewUser, queryUserByEmail } from '../services/db/userColl.js';
import { sendVerificationMail } from '../services/email.js';
import { assertAccessToken } from '../utilities/auth.js';
import { createErrorResponse } from '../utilities/error.js';

app.http('auth', {
  methods: ['GET', 'POST'],
  async handler(request) {
    switch (request.method) {
      case 'GET': {
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
          console.error(error);
          const error = new Error('Access token has expired');
          return createErrorResponse(401, error);
        }

        console.log(
          l`Got existing auth ${{
            userId: auth.userId,
            verifyStatus: auth.verifyStatus,
          }}`
        );

        // Response shouldn't include the verifyCode
        const refreshedAt = auth.refreshedAt.getTime();
        const response = {
          _id: auth._id,
          userId: auth.userId,
          verification: auth.verifyStatus,
          verificationSocket: auth.verifySocket,
          expiresAt: new Date(refreshedAt + TimeSpan.fromSeconds(auth.ttl)),
        };

        return { jsonBody: response };
      }

      case 'POST': {
        /** @type {{email: string}} */
        const { email } = await request.json();

        // Check the email is valid
        if (!validateEmail(email)) {
          const error = new Error('Must specify a valid email address');
          console.error(error);
          return createErrorResponse(400, error);
        }

        // Use a hash of the email to track the user for privacy
        const emailHash = createHash(email.toLowerCase(), { alg: 'sha256' });

        // Get the existing user or create a new one
        let user = await queryUserByEmail(emailHash);
        if (!user) {
          console.log(l`Creating a new user ${{ emailHash }}`);
          user = await insertNewUser(emailHash);
          console.log(l`Created new user ${{ userId: user._id }}`);
        }

        // Auto verify if local or dev and SkipVerify header is specified
        const verified =
          (isLocal || isDev) && request.headers.get('SkipVerify');
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
        if (auth.verifyStatus === PendingVerification) {
          console.log(
            l`Emailing verification ${{ emailHash, authId: auth._id }}`
          );
          await sendVerificationMail(email, auth.verifyCode);
        }

        // Response shouldn't include the verifyCode
        const refreshedAt = auth.refreshedAt.getTime();
        return {
          jsonBody: {
            _id: auth._id,
            userId: auth.userId,
            accessToken: auth.accessToken,
            verification: auth.verifyStatus,
            verificationSocket: auth.verifySocket,
            expiresAt: new Date(refreshedAt + TimeSpan.fromSeconds(auth.ttl)),
          },
        };
      }
    }
  },
});
