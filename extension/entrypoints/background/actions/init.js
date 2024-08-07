import { checkAuth } from '@/api/auth.js';
import { userAuth } from '@/utilities/storage.js';
import memoize from 'memoize';

import { BaseAction } from './base.js';

export class InitAction extends BaseAction {
  static actionName = 'init';
  static invoke = memoize(async () => {
    const auth = await userAuth.getValue();
    
    // If no auth yet just skip
    if (!auth) return;

    // If an auth exists check it's still valid
    try {
      const authUpdate = await checkAuth();
      await userAuth.setValue({ ...auth, ...authUpdate });
    } catch (error) {
      if (error.status === 401) await userAuth.removeValue();
    }
  });
}
