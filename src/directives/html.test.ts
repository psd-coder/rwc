import { describe, expect, it } from 'vitest';
import { defineComponent } from '../define';
import { registerAdapter, resetAdapterForTests } from '../adapters/registry';
import { createStore, nextTag, nextTick, setStore, testAdapter } from '../test-utils';

describe('x-html directive', () => {
  it('renders and updates innerHTML', async () => {
    resetAdapterForTests();
    registerAdapter(testAdapter);

    const content = createStore('<span>Hi</span>');
    const tag = nextTag('rwc-html');
    defineComponent(tag, () => ({ content }));

    document.body.innerHTML = `<${tag}><div x-html="content"></div></${tag}>`;

    const div = document.querySelector(`${tag} div`) as HTMLDivElement;
    await nextTick();
    expect(div.innerHTML).toBe('<span>Hi</span>');

    setStore(content, '<em>Yo</em>');
    expect(div.innerHTML).toBe('<em>Yo</em>');
  });
});
