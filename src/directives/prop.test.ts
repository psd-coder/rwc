import { describe, expect, it } from 'vitest';
import { defineComponent } from '../define';
import { registerAdapter, resetAdapterForTests } from '../adapters/registry';
import { createStore, nextTag, nextTick, setStore, testAdapter } from '../test-utils';

describe('x-prop directive', () => {
  it('updates element properties', async () => {
    resetAdapterForTests();
    registerAdapter(testAdapter);

    const value = createStore('alpha');
    const tag = nextTag('rwc-prop');
    defineComponent(tag, () => ({ value }));

    document.body.innerHTML = `<${tag}><input x-prop:value="value" /></${tag}>`;
    const input = document.querySelector(`${tag} input`) as HTMLInputElement;

    await nextTick();
    expect(input.value).toBe('alpha');

    setStore(value, 'beta');
    expect(input.value).toBe('beta');
  });
});
