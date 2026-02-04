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

  it('renders null and undefined as empty string', async () => {
    const content = createStore<unknown>(null);
    const tag = nextTag('rwc-html-nullish');
    defineComponent(tag, () => ({ content }), { adapter: testReactivity });

    document.body.innerHTML = `<${tag}><div x-html="content"></div></${tag}>`;
    const div = document.querySelector(`${tag} div`) as HTMLDivElement;

    await nextTick();
    expect(div.innerHTML).toBe('');

    setStore(content, undefined);
    expect(div.innerHTML).toBe('');

    setStore(content, '<b>back</b>');
    expect(div.innerHTML).toBe('<b>back</b>');
  });

  it('cleans up subscriptions on disconnect', async () => {
    const content = createStore('<span>Hi</span>');
    const tag = nextTag('rwc-html-cleanup');
    defineComponent(tag, () => ({ content }), { adapter: testReactivity });

    document.body.innerHTML = `<${tag}><div x-html="content"></div></${tag}>`;
    const host = document.querySelector(tag) as HTMLElement;

    await nextTick();
    expect(content.subs.size).toBe(1);

    host.remove();
    expect(content.subs.size).toBe(0);
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
