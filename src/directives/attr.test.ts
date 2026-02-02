import { describe, expect, it } from 'vitest';
import { defineComponent } from '../define';
import { registerAdapter, resetAdapterForTests } from '../adapters/registry';
import { createStore, nextTag, nextTick, setStore, testAdapter } from '../test-utils';

describe('x-attr directive', () => {
  it('sets and removes attributes', async () => {
    resetAdapterForTests();
    registerAdapter(testAdapter);

    const title = createStore<unknown>('hello');
    const tag = nextTag('rwc-attr');
    defineComponent(tag, () => ({ title }));

    document.body.innerHTML = `<${tag}><div x-attr:title="title"></div></${tag}>`;
    const div = document.querySelector(`${tag} div`) as HTMLDivElement;

    await nextTick();
    expect(div.getAttribute('title')).toBe('hello');

    setStore(title, false);
    expect(div.hasAttribute('title')).toBe(false);
  });
});
