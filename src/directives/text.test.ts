import { describe, expect, it } from 'vitest';
import { defineComponent } from '../define';
import { createStore, nextTag, nextTick, setStore, testReactivity } from '../test-utils';

describe('x-text directive', () => {
  it('renders literal text', async () => {
    const tag = nextTag('rwc-text-literal');
    defineComponent(tag, () => ({}), { adapter: testReactivity });

    document.body.innerHTML = `<${tag}><span x-text="'hello'"></span></${tag}>`;
    const span = document.querySelector(`${tag} span`) as HTMLSpanElement;

    await nextTick();
    expect(span.textContent).toBe('hello');
  });

  it('renders and updates text content', async () => {
    const count = createStore(1);
    const tag = nextTag('rwc-text');
    defineComponent(tag, () => ({ count }), { adapter: testReactivity });

    document.body.innerHTML = `<${tag}><span x-text="count"></span></${tag}>`;

    const span = document.querySelector(`${tag} span`) as HTMLSpanElement;
    await nextTick();
    expect(span.textContent).toBe('1');

    setStore(count, 3);
    expect(span.textContent).toBe('3');
  });

  it('supports expressions', async () => {
    const count = createStore(5);
    const tag = nextTag('rwc-text-expr');
    defineComponent(tag, () => ({ count }), { adapter: testReactivity });

    document.body.innerHTML = `<${tag}><span x-text="count * 2"></span></${tag}>`;
    const span = document.querySelector(`${tag} span`) as HTMLSpanElement;

    await nextTick();
    expect(span.textContent).toBe('10');

    setStore(count, 7);
    expect(span.textContent).toBe('14');
  });

  it('cleans up subscriptions on disconnect', async () => {
    const count = createStore(1);
    const tag = nextTag('rwc-text-cleanup');
    defineComponent(tag, () => ({ count }), { adapter: testReactivity });

    document.body.innerHTML = `<${tag}><span x-text="count"></span></${tag}>`;
    const host = document.querySelector(tag) as HTMLElement;

    await nextTick();
    expect(count.subs.size).toBe(1);

    host.remove();
    expect(count.subs.size).toBe(0);
  });
});
