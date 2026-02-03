import type { ReactivityAdapter } from './adapters/types';

export type Store<T> = { value: T; subs: Set<(value: T) => void> };

export const createStore = <T,>(value: T): Store<T> => ({ value, subs: new Set() });

export const testReactivity: ReactivityAdapter<Store<unknown>> = {
  isStore: (value): value is Store<unknown> =>
    !!value && typeof value === 'object' && 'value' in value && 'subs' in value,
  get: (store) => store.value,
  subscribe: (store, callback) => {
    const handler = (value: unknown) => callback(value);
    store.subs.add(handler);
    callback(store.value);
    return () => store.subs.delete(handler);
  }
};

export const setStore = <T,>(store: Store<T>, value: T) => {
  store.value = value;
  for (const sub of store.subs) sub(value);
};

export const nextTick = () => Promise.resolve();

export const nextTag = (() => {
  let id = 0;
  return (prefix = 'rwc-test') => `${prefix}-${id++}`;
})();
