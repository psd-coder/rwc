import type { ReactivityAdapter } from '../../src/adapters/types';

export type Signal<T> = {
  value: T;
  subs: Set<(value: T) => void>;
  set: (value: T) => void;
};

export const signal = <T,>(initial: T): Signal<T> => {
  const store: Signal<T> = {
    value: initial,
    subs: new Set(),
    set(value) {
      store.value = value;
      for (const sub of store.subs) sub(value);
    }
  };
  return store;
};

export const derived = <T, S>(source: Signal<T>, map: (value: T) => S): Signal<S> => {
  const out = signal(map(source.value));
  source.subs.add(() => out.set(map(source.value)));
  return out;
};

export const localAdapter: ReactivityAdapter<Signal<unknown>> = {
  isStore: (value): value is Signal<unknown> =>
    !!value && typeof value === 'object' && 'value' in value && 'subs' in value,
  get: (store) => store.value,
  subscribe: (store, callback) => {
    const handler = (value: unknown) => callback(value);
    store.subs.add(handler);
    callback(store.value);
    return () => store.subs.delete(handler);
  }
};
