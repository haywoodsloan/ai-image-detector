import { app } from '@azure/functions';

import { insertNewUser } from '../services/db/userColl.js';

app.http('createUser', {
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: async (_, context) => {
    context.log(`Creating a new user`);
    const newUser = await insertNewUser();

    context.log(`New user ID: ${newUser.userId}`);
    return { jsonBody: newUser };
  },
});
