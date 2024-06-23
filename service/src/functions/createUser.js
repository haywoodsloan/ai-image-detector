import { app } from '@azure/functions';
import TimeSpan from 'common/utilities/TimeSpan.js';
import { isLocal } from 'common/utilities/environment.js';
import { isProd } from 'common/utilities/environment.js';
import { l, randomString } from 'common/utilities/string.js';

import { insertNewUser, queryLastCreate } from '../services/db/userColl.js';
import { createErrorResponse } from '../utilities/error.js';

// An IP can only create a user ID every 5 minutes
const IpCreateTimeout = TimeSpan.fromMinutes(30);

app.http('createUser', {
  methods: ['POST'],
  authLevel: isProd ? 'anonymous' : 'function',
  handler: async (request, context) => {
    const requestIPs =
      request.headers.get('X-Forwarded-For') ||
      request.headers.get('X-Forwarded-Client-Ip');

    // Require a client IP to be provided unless this is local testing
    context.log(l`Request IPs ${{ IPs: requestIPs }}`);
    const clientIp = requestIPs?.split(',')?.[0];
    if (!clientIp && !isLocal) {
      const error = new Error('Client IP missing from request headers');
      context.error(error);
      return createErrorResponse(400, error);
    }

    // Check that this IP hasn't created another User ID in that last 5 minutes
    const lastCreate = await queryLastCreate(clientIp);
    context.log(l`Last Create ${{ lastCreate }}`);
    if (lastCreate && Date.now() - lastCreate.getTime() < IpCreateTimeout) {
      const error = new Error(
        'Too many create requests from this IP, ' +
          `try again in ${IpCreateTimeout.getMinutes()} minutes`
      );
      context.error(error);
      return createErrorResponse(429, error);
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
