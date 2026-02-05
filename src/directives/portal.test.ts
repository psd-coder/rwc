import { describe, expect, it } from 'vitest';
import { createBindingContext } from '../context';
import { defineComponent } from '../define';
import { createStore, nextTag, nextTick, setStore, testReactivity } from '../test-utils';
import { processPortal } from './portal';

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

  it('throws when target is missing', () => {
    const template = document.createElement('template');
    const ctx = createBindingContext({}, testReactivity);
    expect(() => processPortal(template, '#missing-target', ctx, () => {})).toThrow(
      'Portal target not found: #missing-target'
    );
  });

  it('supports body as a target', async () => {
    const tag = nextTag('rwc-portal-body');
    defineComponent(tag, () => ({}), { adapter: testReactivity });

    document.body.innerHTML = `
      <${tag}>
        <template x-portal="body">
          <div id="portal-body-content">Body target</div>
        </template>
      </${tag}>
    `;

    await nextTick();
    expect(document.body.querySelector('#portal-body-content')).toBeTruthy();
  });

  it('supports multiple portals to the same target', async () => {
    const tagA = nextTag('rwc-portal-a');
    const tagB = nextTag('rwc-portal-b');
    defineComponent(tagA, () => ({}), { adapter: testReactivity });
    defineComponent(tagB, () => ({}), { adapter: testReactivity });

    document.body.innerHTML = `
      <div id="portal-multi-target"></div>
      <${tagA}>
        <template x-portal="#portal-multi-target">
          <span class="first">First</span>
        </template>
      </${tagA}>
      <${tagB}>
        <template x-portal="#portal-multi-target">
          <span class="second">Second</span>
        </template>
      </${tagB}>
    `;

    await nextTick();
    const target = document.querySelector('#portal-multi-target') as HTMLDivElement;
    expect(target.querySelector('.first')).toBeTruthy();
    expect(target.querySelector('.second')).toBeTruthy();
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

  it('hydrates custom-element lists inside a portal', async () => {
    const itemA = createStore({ id: 'a', text: 'Alpha' });
    const itemB = createStore({ id: 'b', text: 'Beta' });
    const items = createStore([itemA, itemB]);
    const hostTag = nextTag('rwc-portal-hydrate');
    const childTag = nextTag('rwc-portal-item');
    const toggles: Array<typeof itemA> = [];

    defineComponent(childTag, (ctx) => {
      const $item = ctx.props.$item as typeof itemA;
      const toggle = () => toggles.push($item);
      return { $item, toggle };
    }, { adapter: testReactivity, props: ['$item'] });

    defineComponent(hostTag, () => ({ items }), { adapter: testReactivity });

    document.body.innerHTML = `
      <div id="portal-hydrate-target"></div>
      <${hostTag}>
        <div class="todos" x-portal="#portal-hydrate-target">
          <${childTag} x-for="$item in items" x-key="$item.id" x-prop:$item="$item">
            <span class="label" x-text="$item.text"></span>
            <button x-on:click="toggle()">Toggle</button>
          </${childTag}>
          <${childTag} x-for="$item in items" x-key="$item.id" x-prop:$item="$item">
            <span class="label" x-text="$item.text"></span>
            <button x-on:click="toggle()">Toggle</button>
          </${childTag}>
        </div>
      </${hostTag}>
    `;

    await nextTick();

    const target = document.querySelector('#portal-hydrate-target') as HTMLDivElement;
    const labels = Array.from(target.querySelectorAll(`${childTag} .label`));
    const labelValues = labels.map((label) => label.textContent?.trim());
    expect(labelValues).toContain('Alpha');
    expect(labelValues).toContain('Beta');

    const buttons = Array.from(target.querySelectorAll(`${childTag} button`)) as HTMLButtonElement[];
    buttons[0]?.click();
    buttons[1]?.click();
    expect(toggles).toHaveLength(2);
    expect(toggles).toContain(itemA);
    expect(toggles).toContain(itemB);
  });
});
