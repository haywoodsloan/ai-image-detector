import memoize from 'memoize';

import { checkAuth } from '@/api/auth.js';
import { subAuthVerify } from '@/utilities/pubsub.js';
import { userAuth } from '@/utilities/storage.js';

import { BaseAction } from './base.js';

export class InitAction extends BaseAction {
  static actionName = 'InitAction';
  static invoke = memoize(async () => {
    // If an auth exists check it's still valid
    let auth = await userAuth.getValue();
    if (auth) {
      try {
        const authUpdate = await checkAuth();
        auth = { ...auth, ...authUpdate };
        await userAuth.setValue(auth);
      } catch (error) {
        if (error.status === 401) {
          auth = undefined;
          await userAuth.removeValue();
        } else throw error;
      }
    }

    /** @type {() => void} */
    let unsubAuthVerify;
    if (auth?.verification === 'pending' && auth?.verificationSocket) {
      unsubAuthVerify = subAuthVerify(auth.verificationSocket, async () => {
        const stored = await userAuth.getValue();
        auth = { ...stored, verification: 'verified' };
        await userAuth.setValue(auth);
      });
    }

    userAuth.watch((newAuth) => {
      unsubAuthVerify?.();
      if (newAuth?.verification === 'pending' && newAuth?.verificationSocket) {
        unsubAuthVerify = subAuthVerify(
          newAuth.verificationSocket,
          async () => {
            const stored = await userAuth.getValue();
            newAuth = { ...stored, verification: 'verified' };
            await userAuth.setValue(newAuth);
          }
        );
      }
    });
  });
}
