import { describe, expect, it } from 'vitest';
import { defineComponent } from '../define';
import { createStore, nextTag, nextTick, setStore, testReactivity } from '../test-utils';

describe('x-prop directive', () => {
  it('sets properties from literal expressions', async () => {
    const tag = nextTag('rwc-prop-literal');
    defineComponent(tag, () => ({}), { adapter: testReactivity });

    document.body.innerHTML = `<${tag}><input x-prop:value="'hello'" /></${tag}>`;
    const input = document.querySelector(`${tag} input`) as HTMLInputElement;

    await nextTick();
    expect(input.value).toBe('hello');
  });

  it('updates element properties', async () => {
    const value = createStore('alpha');
    const tag = nextTag('rwc-prop');
    defineComponent(tag, () => ({ value }), { adapter: testReactivity });

    document.body.innerHTML = `<${tag}><input x-prop:value="value" /></${tag}>`;
    const input = document.querySelector(`${tag} input`) as HTMLInputElement;

    await nextTick();
    expect(input.value).toBe('alpha');

    setStore(value, 'beta');
    expect(input.value).toBe('beta');
  });

  it('assigns null and undefined directly to properties', async () => {
    const val = createStore<unknown>('test');
    const tag = nextTag('rwc-prop-nullish');
    defineComponent(tag, () => ({ val }), { adapter: testReactivity });

    // HTML lowercases attribute names, so use all-lowercase prop
    document.body.innerHTML = `<${tag}><div x-prop:customprop="val"></div></${tag}>`;
    const div = document.querySelector(`${tag} div`) as HTMLDivElement;

    await nextTick();
    expect((div as any).customprop).toBe('test');

    setStore(val, null);
    expect((div as any).customprop).toBeNull();

    setStore(val, undefined);
    expect((div as any).customprop).toBeUndefined();
  });

  it('updates boolean properties', async () => {
    const checked = createStore(false);
    const tag = nextTag('rwc-prop-checked');
    defineComponent(tag, () => ({ checked }), { adapter: testReactivity });

    document.body.innerHTML = `<${tag}><input type="checkbox" x-prop:checked="checked" /></${tag}>`;
    const input = document.querySelector(`${tag} input`) as HTMLInputElement;

    await nextTick();
    expect(input.checked).toBe(false);

    setStore(checked, true);
    expect(input.checked).toBe(true);
  });
});
