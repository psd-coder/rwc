import { describe, expect, it } from 'vitest';
import { defineComponent } from '../define';
import { createStore, nextTag, nextTick, setStore, testReactivity } from '../test-utils';

describe('x-prop directive', () => {
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
});
