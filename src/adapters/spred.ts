import type { ReactivityAdapter } from './types';

type SpredSignal = {
  value: unknown;
  subscribe: (listener: (value: unknown) => void) => () => void;
};

export const spred: ReactivityAdapter<SpredSignal> = {
  isStore(value: unknown): value is SpredSignal {
    return !!value && typeof value === 'object' && 'value' in value && 'subscribe' in value;
  },
  get(store) {
    return store.value;
  },
  subscribe(store, callback) {
    return store.subscribe(callback);
  }
};
