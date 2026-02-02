import { describe, expect, it } from 'vitest';
import { defineComponent } from './define';
import { registerAdapter, resetAdapterForTests } from './adapters/registry';
import type { ReactivityAdapter } from './adapters/types';

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

const nextTick = () => Promise.resolve();

describe('defineComponent', () => {
  it('registers custom element and runs setup with context', async () => {
    resetAdapterForTests();
    registerAdapter(adapter);
    defineComponent('rwc-define-test', (ctx) => {
      expect(ctx.host).toBeInstanceOf(HTMLElement);
      return {};
    });

    const el = document.createElement('rwc-define-test');
    document.body.append(el);
    expect(customElements.get('rwc-define-test')).toBeDefined();
    await nextTick();
    el.remove();
  });

  it('runs cleanup on disconnect', async () => {
    resetAdapterForTests();
    registerAdapter(adapter);
    defineComponent('rwc-cleanup-test', (ctx) => {
      ctx.registerCleanup(() => {
        (ctx.host as HTMLElement).dataset.cleaned = 'true';
      });
      return {};
    });

    const el = document.createElement('rwc-cleanup-test');
    document.body.append(el);
    await nextTick();
    el.remove();
    expect(el.dataset.cleaned).toBe('true');
  });

  it('replaces adapter when requested', async () => {
    resetAdapterForTests();
    registerAdapter(adapter);
    registerAdapter(adapter, { replace: true });
    defineComponent('rwc-replace-test', () => ({}));
    const el = document.createElement('rwc-replace-test');
    document.body.append(el);
    await nextTick();
    el.remove();
  });

  it('updates directive bindings on store changes', async () => {
    resetAdapterForTests();
    registerAdapter(adapter);

    const count = createStore(1);
    defineComponent('rwc-text-test-define', () => ({ count }));
    document.body.innerHTML = '<rwc-text-test-define><span x-text="count"></span></rwc-text-test-define>';

    const span = document.querySelector('rwc-text-test-define span') as HTMLSpanElement;
    await nextTick();
    expect(span.textContent).toBe('1');

    count.value = 2;
    for (const sub of count.subs) sub(2);
    expect(span.textContent).toBe('2');
  });
});
