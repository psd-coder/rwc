import { describe, expect, it } from 'vitest';
import { defineComponent } from '../define';
import { registerAdapter, resetAdapterForTests } from '../adapters/registry';
import type { ReactivityAdapter } from '../adapters/types';

type Store<T> = { value: T; subs: Set<(value: T) => void> };

const createStore = <T,>(value: T): Store<T> => ({ value, subs: new Set() });

const adapter: ReactivityAdapter<Store<unknown>> = {
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

const setStore = <T,>(store: Store<T>, value: T) => {
  store.value = value;
  for (const sub of store.subs) sub(value);
};

const nextTick = () => Promise.resolve();

describe('x-text directive', () => {
  it('renders and updates text content', async () => {
    resetAdapterForTests();
    registerAdapter(adapter);

    const count = createStore(1);

    defineComponent('rwc-text-test', () => ({ count }));

    document.body.innerHTML = '<rwc-text-test><span x-text="count"></span></rwc-text-test>';

    const span = document.querySelector('rwc-text-test span') as HTMLSpanElement;
    await nextTick();
    expect(span.textContent).toBe('1');

    setStore(count, 3);
    expect(span.textContent).toBe('3');
  });
});
