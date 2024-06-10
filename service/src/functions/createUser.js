import { app } from '@azure/functions';

import { insertNewUser } from '../services/db/userColl.js';
import { logObject } from '../utilities/string.js';

app.http('createUser', {
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: async (_, context) => {
    context.log(`Creating new user`);
    const newUser = await insertNewUser();

    context.log(`New user created ${logObject({ userId: newUser.userId })}`);
    return { jsonBody: newUser };
  },
});
