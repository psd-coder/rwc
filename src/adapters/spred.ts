import type { ReactivityAdapter, StoreValueTemplate } from './types';

type SpredSignal<T = unknown> = {
  value: T;
  subscribe: (listener: (value: T) => void) => () => void;
};

interface SpredValueTemplate extends StoreValueTemplate {
  readonly value: this['store'] extends SpredSignal<infer TValue> ? TValue : unknown;
}

export const spred: ReactivityAdapter<SpredSignal<unknown>, SpredValueTemplate> = {
  isStore(value: unknown): value is SpredSignal<unknown> {
    return !!value && typeof value === 'object' && 'value' in value && 'subscribe' in value;
  },
  get<T>(store: SpredSignal<T>) {
    return store.value;
  },
  subscribe<T>(store: SpredSignal<T>, callback: (value: T) => void) {
    return store.subscribe(callback);
  }
};
