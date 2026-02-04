import { describe, expect, it } from 'vitest';
import { defineComponent } from '../define';
import { createStore, nextTag, nextTick, setStore, testReactivity } from '../test-utils';

describe('x-attr directive', () => {
  it('sets attributes from literal expressions', async () => {
    const tag = nextTag('rwc-attr-literal');
    defineComponent(tag, () => ({}), { adapter: testReactivity });

    document.body.innerHTML = `<${tag}><div x-attr:title="'hello'"></div></${tag}>`;
    const div = document.querySelector(`${tag} div`) as HTMLDivElement;

    await nextTick();
    expect(div.getAttribute('title')).toBe('hello');
  });

  it('sets and removes attributes', async () => {
    const title = createStore<unknown>('hello');
    const tag = nextTag('rwc-attr');
    defineComponent(tag, () => ({ title }), { adapter: testReactivity });

    document.body.innerHTML = `<${tag}><div x-attr:title="title"></div></${tag}>`;
    const div = document.querySelector(`${tag} div`) as HTMLDivElement;

    await nextTick();
    expect(div.getAttribute('title')).toBe('hello');

    setStore(title, false);
    expect(div.hasAttribute('title')).toBe(false);
  });

  it('removes attributes when value is null', async () => {
    const title = createStore<unknown>('hello');
    const tag = nextTag('rwc-attr-null');
    defineComponent(tag, () => ({ title }), { adapter: testReactivity });

    document.body.innerHTML = `<${tag}><div x-attr:title="title"></div></${tag}>`;
    const div = document.querySelector(`${tag} div`) as HTMLDivElement;

    await nextTick();
    expect(div.getAttribute('title')).toBe('hello');

    setStore(title, null);
    expect(div.hasAttribute('title')).toBe(false);
  });

  it('removes attribute when value is undefined', async () => {
    const title = createStore<unknown>('hello');
    const tag = nextTag('rwc-attr-undef');
    defineComponent(tag, () => ({ title }), { adapter: testReactivity });

    document.body.innerHTML = `<${tag}><div x-attr:title="title"></div></${tag}>`;
    const div = document.querySelector(`${tag} div`) as HTMLDivElement;

    await nextTick();
    expect(div.getAttribute('title')).toBe('hello');

    setStore(title, undefined);
    expect(div.hasAttribute('title')).toBe(false);
  });

  it('serializes true to an empty attribute', async () => {
    const enabled = createStore(true);
    const tag = nextTag('rwc-attr-true');
    defineComponent(tag, () => ({ enabled }), { adapter: testReactivity });

    document.body.innerHTML = `<${tag}><button x-attr:disabled="enabled"></button></${tag}>`;
    const button = document.querySelector(`${tag} button`) as HTMLButtonElement;

    await nextTick();
    expect(button.getAttribute('disabled')).toBe('');
  });
});
