import { app } from '@azure/functions';
import { l } from 'common/utilities/string.js';

import { verifyAuth } from '../services/db/authColl.js';
import { getStaticHtml } from '../utilities/html.js';
import { captureConsole } from '../utilities/log.js';

const VerifySuccessHtml = 'verifySuccess';
const VerifyFailedHtml = 'verifyFailed';
const VerifyMissingHtml = 'verifyMissing';

const HtmlHeaders = { 'Content-Type': 'text/html' };

app.http('verifyAuth', {
  methods: ['GET'],
  authLevel: 'anonymous',
  handler: async (request, context) => {
    captureConsole(context);

    // Error if the code is missing
    const code = request.query.get('code');
    if (!code) {
      const error = new Error('Must specify a verification code');
      console.error(error);
      return {
        status: 400,
        body: await getStaticHtml(VerifyMissingHtml),
        headers: HtmlHeaders,
      };
    }

    // Try to verify the auth with the code
    const auth = await verifyAuth(code);
    if (!auth) {
      const error = new Error('Verification code is no longer valid');
      console.error(error);
      return {
        status: 400,
        body: await getStaticHtml(VerifyFailedHtml),
        headers: HtmlHeaders,
      };
    }

    // Return a success page if the auth was verified successfully
    console.log(l`Verified auth ${{ userId: auth.userId, authId: auth._id }}`);
    return {
      body: await getStaticHtml(VerifySuccessHtml),
      headers: HtmlHeaders,
    };
  },
});
