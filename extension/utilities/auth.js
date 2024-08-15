import { userAuth, useStorage } from './storage.js';

export function useHasAuth() {
  const authRef = useStorage(userAuth);
  return computed(() => !!authRef.value?.accessToken);
}

export function useAuth() {
  return useStorage(userAuth);
}