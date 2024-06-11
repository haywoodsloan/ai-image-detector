import { app } from '@azure/functions';

import { insertNewUser } from '../services/db/userColl.js';
import { l } from '../utilities/string.js';

app.http('createUser', {
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: async (_, context) => {
    context.log(`Creating new user`);
    const newUser = await insertNewUser();

    context.log(l`New user created ${{ userId: newUser.userId }}`);
    return { jsonBody: newUser };
  },
});
