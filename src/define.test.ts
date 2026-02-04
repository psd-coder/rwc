import { describe, expect, it } from 'vitest';
import { defineComponent } from './define';
import { createStore, nextTag, nextTick, setStore, testReactivity } from './test-utils';

describe('defineComponent', () => {
  it('registers custom element and runs setup with context', async () => {
    const tag = nextTag('rwc-define');
    defineComponent(tag, (ctx) => {
      expect(ctx.host).toBeInstanceOf(HTMLElement);
      return {};
    }, { adapter: testReactivity });

    const el = document.createElement(tag);
    document.body.append(el);
    expect(customElements.get(tag)).toBeDefined();
    await nextTick();
    el.remove();
  });

  it('runs cleanup on disconnect', async () => {
    const tag = nextTag('rwc-cleanup');
    defineComponent(tag, (ctx) => {
      ctx.registerCleanup(() => {
        (ctx.host as HTMLElement).dataset.cleaned = 'true';
      });
      return {};
    }, { adapter: testReactivity });

    const el = document.createElement(tag);
    document.body.append(el);
    await nextTick();
    el.remove();
    expect(el.dataset.cleaned).toBe('true');
  });

  it('runs multiple cleanup callbacks', async () => {
    const tag = nextTag('rwc-multi-cleanup');
    let cleaned = 0;
    defineComponent(tag, (ctx) => {
      ctx.registerCleanup(() => {
        cleaned += 1;
      });
      ctx.registerCleanup(() => {
        cleaned += 1;
      });
      return {};
    }, { adapter: testReactivity });

    const el = document.createElement(tag);
    document.body.append(el);
    await nextTick();
    el.remove();
    expect(cleaned).toBe(2);
  });

  it('silently ignores double registration of the same tag', () => {
    const tag = nextTag('rwc-double');
    defineComponent(tag, () => ({}), { adapter: testReactivity });
    // Second call must not throw
    defineComponent(tag, () => ({}), { adapter: testReactivity });
    expect(customElements.get(tag)).toBeDefined();
  });

  it('throws when adapter is missing', () => {
    const tag = nextTag('rwc-no-adapter');
    expect(() => defineComponent(tag, () => ({}), { adapter: undefined as any })).toThrow(/[Aa]dapter/);
  });

  it('skips initialization if element is disconnected before microtask fires', async () => {
    const tag = nextTag('rwc-disconnected');
    let setupCalled = false;
    defineComponent(tag, () => {
      setupCalled = true;
      return {};
    }, { adapter: testReactivity });

    const el = document.createElement(tag);
    document.body.append(el);
    el.remove();
    await nextTick();
    expect(setupCalled).toBe(false);
  });

  it('updates directive bindings on store changes', async () => {
    const count = createStore(1);
    const tag = nextTag('rwc-text-define');
    defineComponent(tag, () => ({ count }), { adapter: testReactivity });
    document.body.innerHTML = `<${tag}><span x-text="count"></span></${tag}>`;

    const span = document.querySelector(`${tag} span`) as HTMLSpanElement;
    await nextTick();
    expect(span.textContent).toBe('1');

    setStore(count, 2);
    expect(span.textContent).toBe('2');
  });
});
