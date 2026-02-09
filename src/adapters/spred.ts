import type { ReactivityAdapter, StoreShapeTemplate, StoreValueTemplate } from "./types";

type SpredReadableSignal<T = unknown> = {
  value: T;
  subscribe: (listener: (value: T) => void) => () => void;
};

type SpredWritableSignal<T = unknown> = SpredReadableSignal<T> & {
  set: (value: T) => void;
};

interface SpredValueTemplate extends StoreValueTemplate {
  readonly value: this["store"] extends SpredReadableSignal<infer TValue> ? TValue : unknown;
}

interface SpredReadableStoreTemplate extends StoreShapeTemplate {
  readonly store: SpredReadableSignal<this["value"]>;
}

interface SpredWritableStoreTemplate extends StoreShapeTemplate {
  readonly store: SpredWritableSignal<this["value"]>;
}

function createSpredSignal<T>(initial: T): SpredWritableSignal<T> {
  const subs = new Set<(value: T) => void>();
  const signal: SpredWritableSignal<T> = {
    value: initial,
    subscribe(listener: (value: T) => void) {
      subs.add(listener);
      listener(signal.value);
      return () => subs.delete(listener);
    },
    set(next: T) {
      signal.value = next;
      for (const sub of subs) {
        sub(next);
      }
    },
  };
  return signal;
}

export const spred: ReactivityAdapter<
  SpredReadableSignal<unknown>,
  SpredValueTemplate,
  SpredReadableStoreTemplate,
  SpredWritableStoreTemplate
> = {
  isStore(value: unknown): value is SpredReadableSignal<unknown> {
    return !!value && typeof value === "object" && "value" in value && "subscribe" in value;
  },
  get<T>(store: SpredReadableSignal<T>) {
    return store.value;
  },
  subscribe<T>(store: SpredReadableSignal<T>, callback: (value: T) => void) {
    return store.subscribe(callback);
  },
  create<TValue>(initial: TValue) {
    return createSpredSignal(initial);
  },
  set<TValue>(store: SpredWritableSignal<TValue>, value: TValue) {
    store.set(value);
  },
};
