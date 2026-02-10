import type { ReactivityAdapter, StoreShapeTemplate, StoreValueTemplate } from "./adapters/types";

export type Store<T> = {
  value: T;
  subs: Set<(value: T) => void>;
  set: (value: T) => void;
};
interface TestStoreValueTemplate extends StoreValueTemplate {
  readonly value: this["store"] extends Store<infer TValue> ? TValue : unknown;
}
interface TestReadableStoreTemplate extends StoreShapeTemplate {
  readonly store: Store<this["value"]>;
}
interface TestWritableStoreTemplate extends StoreShapeTemplate {
  readonly store: Store<this["value"]>;
}

export const createStore = <T>(value: T): Store<T> => {
  const subs = new Set<(next: T) => void>();
  const store: Store<T> = {
    value,
    subs,
    set(next: T) {
      store.value = next;
      for (const sub of subs) {
        sub(next);
      }
    },
  };
  return store;
};

export const testReactivity: ReactivityAdapter<
  Store<unknown>,
  TestStoreValueTemplate,
  TestReadableStoreTemplate,
  TestWritableStoreTemplate
> = {
  isStore: (value): value is Store<unknown> =>
    !!value && typeof value === "object" && "value" in value && "subs" in value,
  get: <T>(store: Store<T>) => store.value,
  subscribe: <T>(store: Store<T>, callback: (value: T) => void) => {
    const handler = (value: T) => callback(value);
    store.subs.add(handler);
    callback(store.value);
    return () => store.subs.delete(handler);
  },
  create: <T>(initial: T) => createStore(initial),
  set: <T>(store: Store<T>, value: T) => {
    store.set(value);
  },
};

export const setStore = <T>(store: Store<T>, value: T) => {
  store.set(value);
};

export const nextTick = () => Promise.resolve().then(() => Promise.resolve());

export const nextTag = (() => {
  let id = 0;
  return (prefix = "rwc-test") => `${prefix}-${id++}`;
})();
