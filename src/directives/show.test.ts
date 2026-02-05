import { describe, expect, it } from 'vitest';
import { defineComponent } from '../define';
import { createStore, nextTag, nextTick, setStore, testReactivity } from '../test-utils';

describe('x-show directive', () => {
  it('toggles display style', async () => {
    const visible = createStore(true);
    const tag = nextTag('rwc-show');
    defineComponent(tag, () => ({ visible }), { adapter: testReactivity });

    document.body.innerHTML = `<${tag}><div style="display: inline-block" x-show="visible"></div></${tag}>`;
    const div = document.querySelector(`${tag} div`) as HTMLDivElement;

    await nextTick();
    expect(div.style.display).toBe('inline-block');

    setStore(visible, false);
    expect(div.style.display).toBe('none');

    setStore(visible, true);
    expect(div.style.display).toBe('inline-block');
  });

  it('restores a hidden inline display to the default when shown', async () => {
    const visible = createStore(true);
    const tag = nextTag('rwc-show-inline-none');
    defineComponent(tag, () => ({ visible }), { adapter: testReactivity });

    document.body.innerHTML = `<${tag}><div style="display: none" x-show="visible"></div></${tag}>`;
    const div = document.querySelector(`${tag} div`) as HTMLDivElement;

    await nextTick();
    expect(div.style.display).toBe('');

    setStore(visible, false);
    expect(div.style.display).toBe('none');

    setStore(visible, true);
    expect(div.style.display).toBe('');
  });

  it('restores empty inline display to allow CSS rules', async () => {
    const visible = createStore(true);
    const tag = nextTag('rwc-show-css');
    defineComponent(tag, () => ({ visible }), { adapter: testReactivity });

    document.body.innerHTML = `
      <style>.show-box { display: flex; }</style>
      <${tag}><div class="show-box" x-show="visible"></div></${tag}>
    `;
    const div = document.querySelector(`${tag} div`) as HTMLDivElement;

    await nextTick();
    expect(div.style.display).toBe('');

    setStore(visible, false);
    expect(div.style.display).toBe('none');

    setStore(visible, true);
    expect(div.style.display).toBe('');
  });

  it('handles expressions', async () => {
    const count = createStore(5);
    const tag = nextTag('rwc-show-expr');
    defineComponent(tag, () => ({ count }), { adapter: testReactivity });

    document.body.innerHTML = `<${tag}><div x-show="count > 3"></div></${tag}>`;
    const div = document.querySelector(`${tag} div`) as HTMLDivElement;

    await nextTick();
    expect(div.style.display).toBe('');

    setStore(count, 2);
    expect(div.style.display).toBe('none');
  });

  it('clears SSR markers once shown', async () => {
    const visible = createStore(false);
    const tag = nextTag('rwc-show-ssr');
    defineComponent(tag, () => ({ visible }), { adapter: testReactivity });

    document.body.innerHTML = `<${tag}><div x-show="visible" x-show-ssr="false"></div></${tag}>`;
    const div = document.querySelector(`${tag} div`) as HTMLDivElement;

    await nextTick();
    expect(div.getAttribute('x-show-ssr')).toBe('false');
    expect(div.style.display).toBe('none');

    setStore(visible, true);
    expect(div.hasAttribute('x-show-ssr')).toBe(false);
  });
});
