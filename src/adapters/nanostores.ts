import type { ReactivityAdapter } from './types';

type NanoStore = {
  get: () => unknown;
  subscribe: (listener: (value: unknown) => void) => () => void;
};

export const nanostores: ReactivityAdapter<NanoStore> = {
  isStore(value: unknown): value is NanoStore {
    return !!value && typeof value === 'object' && 'subscribe' in value && 'get' in value;
  },
  get(store) {
    return store.get();
  },
  subscribe(store, callback) {
    return store.subscribe(callback);
  }
};
