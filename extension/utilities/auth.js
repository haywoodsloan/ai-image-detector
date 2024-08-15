import memoize from 'memoize';

import { useStorage, userAuth } from './storage.js';

export const useAuthVerified = memoize(() => {
  const authRef = useStorage(userAuth);
  return computed(() => {
    const auth = authRef.value;
    if (auth === null) return null;
    return !!auth?.accessToken && auth?.verification === 'verified';
  });
});

export const useAuthPending = memoize(() => {
  const authRef = useStorage(userAuth);
  return computed(() => {
    const auth = authRef.value;
    if (auth === null) return null;
    return !!auth?.accessToken && auth?.verification === 'pending';
  })
})