import memoize from 'memoize';

import { useStorage, userAuth } from './storage.js';

export const useAuthVerified = memoize(() =>
  useAuthComputed(
    (auth) => !!auth?.accessToken && auth?.verification === 'verified'
  )
);

export const useAuthPending = memoize(() =>
  useAuthComputed(
    (auth) => !!auth?.accessToken && auth?.verification === 'pending'
  )
);

export const useEmail = memoize(() => useAuthComputed((auth) => auth?.email));
export const useVerificationSocket = memoize(() =>
  useAuthComputed((auth) => auth?.verificationSocket)
);

/**
 * @template T
 * @param {(auth: UserAuth) => T} callback
 */
function useAuthComputed(callback) {
  const authRef = useStorage(userAuth);
  return computed(() => {
    if (authRef.value === null) return null;
    return callback(authRef.value);
  });
}
