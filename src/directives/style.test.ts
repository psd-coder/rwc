import { describe, expect, it } from 'vitest';
import { defineComponent } from '../define';
import { registerAdapter, resetAdapterForTests } from '../adapters/registry';
import { createStore, nextTag, nextTick, setStore, testAdapter } from '../test-utils';

describe('x-style directive', () => {
  it('sets and removes inline styles', async () => {
    resetAdapterForTests();
    registerAdapter(testAdapter);

    const color = createStore<unknown>('red');
    const tag = nextTag('rwc-style');
    defineComponent(tag, () => ({ color }));

    document.body.innerHTML = `<${tag}><div x-style:color="color"></div></${tag}>`;
    const div = document.querySelector(`${tag} div`) as HTMLDivElement;

    await nextTick();
    expect(div.style.color).toBe('red');

    setStore(color, null);
    expect(div.style.color).toBe('');
  });
});
