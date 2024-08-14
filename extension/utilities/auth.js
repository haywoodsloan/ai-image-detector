import { userAuth, useStorage } from './storage.js';

export async function waitForAuth() {
  if ((await userAuth.getValue())?.accessToken) return;
  return new Promise((res) => {
    userAuth.watch((auth) => {
      if (auth?.accessToken && auth?.verification === 'verified') {
        res();
      }
    });
  });
}

export function useHasAuth() {
  const authRef = useStorage(userAuth);
  return computed(() => !!authRef.value?.accessToken);
}
