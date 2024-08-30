import { useStorage, userAuth } from './storage.js';

export function useAuth() {
  return useStorage(userAuth);
}