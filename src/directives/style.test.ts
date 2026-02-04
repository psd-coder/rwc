import { describe, expect, it } from 'vitest';
import { defineComponent } from '../define';
import { createStore, nextTag, nextTick, setStore, testReactivity } from '../test-utils';

describe('x-style directive', () => {
  it('sets styles from literal expressions', async () => {
    const tag = nextTag('rwc-style-literal');
    defineComponent(tag, () => ({}), { adapter: testReactivity });

    document.body.innerHTML = `<${tag}><div x-style:color="'blue'"></div></${tag}>`;
    const div = document.querySelector(`${tag} div`) as HTMLDivElement;

    await nextTick();
    expect(div.style.color).toBe('blue');
  });

  it('sets and removes inline styles', async () => {
    const color = createStore<unknown>('red');
    const tag = nextTag('rwc-style');
    defineComponent(tag, () => ({ color }), { adapter: testReactivity });

    document.body.innerHTML = `<${tag}><div x-style:color="color"></div></${tag}>`;
    const div = document.querySelector(`${tag} div`) as HTMLDivElement;

    await nextTick();
    expect(div.style.color).toBe('red');

    setStore(color, null);
    expect(div.style.color).toBe('');
  });

  it('supports expression values', async () => {
    const count = createStore(5);
    const tag = nextTag('rwc-style-expr');
    defineComponent(tag, () => ({ count }), { adapter: testReactivity });

    document.body.innerHTML = `<${tag}><div x-style:opacity="count / 10"></div></${tag}>`;
    const div = document.querySelector(`${tag} div`) as HTMLDivElement;

    await nextTick();
    expect(div.style.opacity).toBe('0.5');

    setStore(count, 8);
    expect(div.style.opacity).toBe('0.8');
  });

  it('supports kebab-case properties', async () => {
    const tag = nextTag('rwc-style-kebab');
    defineComponent(tag, () => ({}), { adapter: testReactivity });

    document.body.innerHTML = `<${tag}><div x-style:background-color="'yellow'"></div></${tag}>`;
    const div = document.querySelector(`${tag} div`) as HTMLDivElement;

    await nextTick();
    expect(div.style.backgroundColor).toBe('yellow');
  });

  it('stringifies true for custom properties', async () => {
    const flag = createStore<unknown>(true);
    const tag = nextTag('rwc-style-true');
    defineComponent(tag, () => ({ flag }), { adapter: testReactivity });

    document.body.innerHTML = `<${tag}><div x-style:--flag="flag"></div></${tag}>`;
    const div = document.querySelector(`${tag} div`) as HTMLDivElement;

    await nextTick();
    expect(div.style.getPropertyValue('--flag')).toBe('true');
  });
});
