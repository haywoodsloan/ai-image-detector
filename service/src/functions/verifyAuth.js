import { app } from '@azure/functions';
import { l } from 'common/utilities/string.js';
import { readFile } from 'fs/promises';
import { join } from 'path';

import { verifyAuth } from '../services/db/authColl.js';
import { createErrorResponse } from '../utilities/error.js';
import { captureConsole } from '../utilities/log.js';

const StaticHtmlPath = 'html/static/';
const VerifySuccessHtml = join(StaticHtmlPath, 'verifySuccess.html');
const VerifyFailedHtml = join(StaticHtmlPath, 'verifyFailed.html');

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
      return { status: 400, body: await readFile(VerifyFailedHtml) };
    }

    console.log(l`Verified auth ${{ userId: auth.userId, authId: auth._id }}`);
    return { body: await readFile(VerifySuccessHtml) };
  },
});
