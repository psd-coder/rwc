import type { ReactivityAdapter, StoreValueTemplate } from './types';

type NanoStore<T = unknown> = {
  get: () => T;
  subscribe: (listener: (value: T) => void) => () => void;
};

interface NanoStoreValueTemplate extends StoreValueTemplate {
  readonly value: this['store'] extends NanoStore<infer TValue> ? TValue : unknown;
}

export const nanostores: ReactivityAdapter<NanoStore<unknown>, NanoStoreValueTemplate> = {
  isStore(value: unknown): value is NanoStore<unknown> {
    return !!value && typeof value === 'object' && 'subscribe' in value && 'get' in value;
  },
  get<T>(store: NanoStore<T>) {
    return store.get();
  },
  subscribe<T>(store: NanoStore<T>, callback: (value: T) => void) {
    return store.subscribe(callback);
  }
};
