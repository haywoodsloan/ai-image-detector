import { app } from '@azure/functions';
import { isLocal } from 'common/utilities/environment.js';

import { insertNewUser, queryUserByIp } from '../services/db/userColl.js';
import { createErrorResponse } from '../utilities/error.js';
import { l, randomString } from '../utilities/string.js';

app.http('createUser', {
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: async (request, context) => {
    const requestIPs =
      request.headers.get('X-Forwarded-For') ||
      request.headers.get('X-Forwarded-Client-Ip');

    // Require a client IP to be provided unless this is local testing
    const clientIp = requestIPs?.split(',')?.[0];
    if (!clientIp && !isLocal) {
      const error = new Error('Client IP missing from request headers');
      context.error(error);
      return createErrorResponse(400, error);
    }

    // Return an existing user for this IP
    const existingUser = await queryUserByIp(clientIp);
    if (existingUser) {
      context.log(l`Found existing user ${{ userId: existingUser.userId }}`);
      return { jsonBody: existingUser };
    }

    // If no existing user create a new one
    context.log(`Creating new user`);
    const newUser = await insertNewUser(
      clientIp ?? `local_${randomString(10)}`
    );

    context.log(l`New user created ${{ userId: newUser.userId }}`);
    return { jsonBody: newUser };
  },
});
