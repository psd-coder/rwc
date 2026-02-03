import { describe, expect, it } from 'vitest';
import { defineComponent } from '../define';
import { createStore, nextTag, nextTick, setStore, testReactivity } from '../test-utils';

describe('x-portal directive', () => {
  it('moves content to target and cleans up', async () => {
    const label = createStore('Hello');
    const tag = nextTag('rwc-portal');
    defineComponent(tag, () => ({ label }), { adapter: testReactivity });

    document.body.innerHTML = `
      <div id="portal-target"></div>
      <${tag}>
        <template x-portal="#portal-target">
          <span x-text="label"></span>
        </template>
      </${tag}>
    `;

    await nextTick();

    const target = document.querySelector('#portal-target') as HTMLDivElement;
    const span = target.querySelector('span') as HTMLSpanElement;
    expect(span.textContent).toBe('Hello');

    setStore(label, 'Updated');
    expect(span.textContent).toBe('Updated');

    const host = document.querySelector(tag) as HTMLElement;
    host.remove();
    expect(target.querySelector('span')).toBeNull();
  });

  it('supports portal + if on the same template', async () => {
    const show = createStore(true);
    const label = createStore('Yo');
    const tag = nextTag('rwc-portal-if');
    defineComponent(tag, () => ({ show, label }), { adapter: testReactivity });

    document.body.innerHTML = `
      <div id="portal-if-target"></div>
      <${tag}>
        <template x-portal="#portal-if-target" x-if="show">
          <span class="note" x-text="label"></span>
        </template>
      </${tag}>
    `;

    await nextTick();

    const target = document.querySelector('#portal-if-target') as HTMLDivElement;
    expect(target.querySelector('.note')?.textContent).toBe('Yo');

    setStore(show, false);
    await nextTick();
    expect(target.querySelector('.note')).toBeNull();

    setStore(label, 'Again');
    setStore(show, true);
    await nextTick();
    expect(target.querySelector('.note')?.textContent).toBe('Again');
  });

  it('supports non-template elements', async () => {
    const label = createStore('Inline');
    const tag = nextTag('rwc-portal-el');
    defineComponent(tag, () => ({ label }), { adapter: testReactivity });

    document.body.innerHTML = `
      <div id="portal-el-target"></div>
      <${tag}>
        <div class="inline" x-portal="#portal-el-target">
          <span x-text="label"></span>
        </div>
      </${tag}>
    `;

    await nextTick();

    const target = document.querySelector('#portal-el-target') as HTMLDivElement;
    expect(target.querySelector('.inline')?.textContent?.trim()).toBe('Inline');
  });
});
