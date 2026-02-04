import { describe, expect, it } from 'vitest';
import { defineComponent } from '../define';
import { createStore, nextTag, nextTick, setStore, testReactivity } from '../test-utils';

describe('x-html directive', () => {
  it('renders literal HTML strings', async () => {
    const tag = nextTag('rwc-html-literal');
    defineComponent(tag, () => ({}), { adapter: testReactivity });

    document.body.innerHTML = `<${tag}><div x-html="'<strong>hello</strong>'"></div></${tag}>`;

    const div = document.querySelector(`${tag} div`) as HTMLDivElement;
    await nextTick();
    expect(div.innerHTML).toBe('<strong>hello</strong>');
    expect(div.querySelector('strong')?.textContent).toBe('hello');
  });

  it('renders and updates innerHTML', async () => {
    const content = createStore('<span>Hi</span>');
    const tag = nextTag('rwc-html');
    defineComponent(tag, () => ({ content }), { adapter: testReactivity });

    document.body.innerHTML = `<${tag}><div x-html="content"></div></${tag}>`;

    const div = document.querySelector(`${tag} div`) as HTMLDivElement;
    await nextTick();
    expect(div.innerHTML).toBe('<span>Hi</span>');

    setStore(content, '<em>Yo</em>');
    expect(div.innerHTML).toBe('<em>Yo</em>');
  });
});
