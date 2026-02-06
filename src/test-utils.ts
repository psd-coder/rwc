import type { ReactivityAdapter, StoreValueTemplate } from './adapters/types';

export type Store<T> = { value: T; subs: Set<(value: T) => void> };
interface TestStoreValueTemplate extends StoreValueTemplate {
  readonly value: this['store'] extends Store<infer TValue> ? TValue : unknown;
}

export const createStore = <T,>(value: T): Store<T> => ({ value, subs: new Set() });

export const testReactivity: ReactivityAdapter<Store<unknown>, TestStoreValueTemplate> = {
  isStore: (value): value is Store<unknown> =>
    !!value && typeof value === 'object' && 'value' in value && 'subs' in value,
  get: <T,>(store: Store<T>) => store.value,
  subscribe: <T,>(store: Store<T>, callback: (value: T) => void) => {
    const handler = (value: T) => callback(value);
    store.subs.add(handler);
    callback(store.value);
    return () => store.subs.delete(handler);
  }
};

export const setStore = <T,>(store: Store<T>, value: T) => {
  store.value = value;
  for (const sub of store.subs) sub(value);
};

export const nextTick = () => Promise.resolve().then(() => Promise.resolve());

export const nextTag = (() => {
  let id = 0;
  return (prefix = 'rwc-test') => `${prefix}-${id++}`;
})();
