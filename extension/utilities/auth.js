import { useStorage, userAuth } from './storage.js';

export function useAuthVerified() {
  return useAuthComputed(
    (auth) => !!auth?.accessToken && auth?.verification === 'verified'
  );
}

export function useAuthPending() {
  return useAuthComputed(
    (auth) => !!auth?.accessToken && auth?.verification === 'pending'
  );
}

export function useEmail() {
  return useAuthComputed((auth) => auth?.email);
}
export function useVerificationSocket() {
  return useAuthComputed((auth) => auth?.verificationSocket);
}

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
