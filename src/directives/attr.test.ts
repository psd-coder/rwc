import { describe, expect, it } from 'vitest';
import { defineComponent } from '../define';
import { createStore, nextTag, nextTick, setStore, testReactivity } from '../test-utils';

describe('x-attr directive', () => {
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
});
