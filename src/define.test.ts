import { describe, expect, it } from 'vitest';
import { defineComponent } from './define';
import { registerAdapter, resetAdapterForTests } from './adapters/registry';
import { createStore, nextTag, nextTick, setStore, testAdapter } from './test-utils';

describe('defineComponent', () => {
  it('registers custom element and runs setup with context', async () => {
    resetAdapterForTests();
    registerAdapter(testAdapter);
    const tag = nextTag('rwc-define');
    defineComponent(tag, (ctx) => {
      expect(ctx.host).toBeInstanceOf(HTMLElement);
      return {};
    });

    const el = document.createElement(tag);
    document.body.append(el);
    expect(customElements.get(tag)).toBeDefined();
    await nextTick();
    el.remove();
  });

  it('runs cleanup on disconnect', async () => {
    resetAdapterForTests();
    registerAdapter(testAdapter);
    const tag = nextTag('rwc-cleanup');
    defineComponent(tag, (ctx) => {
      ctx.registerCleanup(() => {
        (ctx.host as HTMLElement).dataset.cleaned = 'true';
      });
      return {};
    });

    const el = document.createElement(tag);
    document.body.append(el);
    await nextTick();
    el.remove();
    expect(el.dataset.cleaned).toBe('true');
  });

  it('replaces adapter when requested', async () => {
    resetAdapterForTests();
    registerAdapter(testAdapter);
    registerAdapter(testAdapter, { replace: true });
    const tag = nextTag('rwc-replace');
    defineComponent(tag, () => ({}));
    const el = document.createElement(tag);
    document.body.append(el);
    await nextTick();
    el.remove();
  });

  it('updates directive bindings on store changes', async () => {
    resetAdapterForTests();
    registerAdapter(testAdapter);

    const count = createStore(1);
    const tag = nextTag('rwc-text-define');
    defineComponent(tag, () => ({ count }));
    document.body.innerHTML = `<${tag}><span x-text="count"></span></${tag}>`;

    const span = document.querySelector(`${tag} span`) as HTMLSpanElement;
    await nextTick();
    expect(span.textContent).toBe('1');

    setStore(count, 2);
    expect(span.textContent).toBe('2');
  });
});
