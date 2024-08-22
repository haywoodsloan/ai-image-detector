import { useStorage, userAuth } from './storage.js';

export function useVerifyStatus() {
  return useAuthComputed((auth) => auth?.verification);
}

export function useEmail() {
  return useAuthComputed((auth) => auth?.email);
}
export function useVerifySocket() {
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
