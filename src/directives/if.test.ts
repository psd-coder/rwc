import { describe, expect, it } from 'vitest';
import { defineComponent } from '../define';
import { createStore, nextTag, nextTick, setStore, testReactivity } from '../test-utils';

describe('x-if directive', () => {
  it('mounts and disposes nested bindings', async () => {
    const show = createStore(true);
    const count = createStore(0);
    const tag = nextTag('rwc-if');
    defineComponent(tag, () => ({ show, count }), { adapter: testReactivity });

    document.body.innerHTML = `<${tag}><template x-if="show"><span x-text="count"></span></template></${tag}>`;
    await nextTick();

    let span = document.querySelector(`${tag} span`) as HTMLSpanElement;
    expect(span.textContent).toBe('0');

    setStore(count, 1);
    expect(span.textContent).toBe('1');

    setStore(show, false);
    await nextTick();
    expect(document.querySelector(`${tag} span`)).toBeNull();
    expect(count.subs.size).toBe(0);

    setStore(count, 2);
    setStore(show, true);
    await nextTick();

    span = document.querySelector(`${tag} span`) as HTMLSpanElement;
    expect(span.textContent).toBe('2');
    expect(count.subs.size).toBe(1);
  });

  it('supports templates with multiple root nodes', async () => {
    const show = createStore(true);
    const tag = nextTag('rwc-if-multi');
    defineComponent(tag, () => ({ show }), { adapter: testReactivity });

    document.body.innerHTML = `
      <${tag}>
        <template x-if="show"><span>One</span><span>Two</span></template>
      </${tag}>
    `;
    await nextTick();

    const spans = document.querySelectorAll(`${tag} span`);
    expect(spans.length).toBe(2);

    setStore(show, false);
    await nextTick();
    expect(document.querySelectorAll(`${tag} span`).length).toBe(0);

    setStore(show, true);
    await nextTick();
    expect(document.querySelectorAll(`${tag} span`).length).toBe(2);
  });

  it('supports non-template elements', async () => {
    const show = createStore(true);
    const count = createStore(1);
    const tag = nextTag('rwc-if-el');
    defineComponent(tag, () => ({ show, count }), { adapter: testReactivity });

    document.body.innerHTML = `<${tag}><p class="note" x-if="show"><span x-text="count"></span></p></${tag}>`;
    await nextTick();

    let note = document.querySelector(`${tag} .note`) as HTMLParagraphElement;
    expect(note).toBeTruthy();
    expect(note.textContent).toBe('1');

    setStore(show, false);
    await nextTick();
    expect(document.querySelector(`${tag} .note`)).toBeNull();
    expect(count.subs.size).toBe(0);

    setStore(count, 2);
    setStore(show, true);
    await nextTick();

    note = document.querySelector(`${tag} .note`) as HTMLParagraphElement;
    expect(note.textContent).toBe('2');
  });
});
