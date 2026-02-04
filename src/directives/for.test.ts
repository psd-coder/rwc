import { describe, expect, it } from 'vitest';
import { createBindingContext } from '../context';
import { processFor } from './for';
import { defineComponent } from '../define';
import { createStore, nextTag, nextTick, setStore, testReactivity } from '../test-utils';

describe('x-for directive', () => {
  it('requires x-key', () => {
    const template = document.createElement('template');
    template.setAttribute('x-for', 'item in items');
    const ctx = createBindingContext({ items: [] }, testReactivity);

    expect(() => processFor(template, 'item in items', ctx, () => {})).toThrow(/x-key/);
  });

  it('renders and reorders keyed items', async () => {
    const items = createStore([
      { id: 'a' },
      { id: 'b' }
    ]);
    const tag = nextTag('rwc-for');
    defineComponent(tag, () => ({ items }), { adapter: testReactivity });

    document.body.innerHTML = `
      <${tag}>
        <ul>
          <template x-for="item in items" x-key="item.id">
            <li x-attr:data-id="item.id" x-text="$index"></li>
          </template>
        </ul>
      </${tag}>
    `;

    await nextTick();

    const list = document.querySelector(`${tag} ul`) as HTMLUListElement;
    const nodeA = list.querySelector('li[data-id="a"]') as HTMLLIElement;
    const nodeB = list.querySelector('li[data-id="b"]') as HTMLLIElement;

    expect(nodeA.textContent).toBe('0');
    expect(nodeB.textContent).toBe('1');

    setStore(items, [{ id: 'b' }, { id: 'a' }]);
    await nextTick();

    const nodeA2 = list.querySelector('li[data-id="a"]') as HTMLLIElement;
    const nodeB2 = list.querySelector('li[data-id="b"]') as HTMLLIElement;

    expect(nodeA2).toBe(nodeA);
    expect(nodeB2).toBe(nodeB);

    const ordered = Array.from(list.querySelectorAll('li'));
    expect(ordered[0]).toBe(nodeB);
    expect(ordered[1]).toBe(nodeA);
    expect(nodeB.textContent).toBe('0');
    expect(nodeA.textContent).toBe('1');
  });

  it('adds and removes items reactively', async () => {
    const items = createStore([
      { id: 'a' },
      { id: 'b' }
    ]);
    const tag = nextTag('rwc-for-add-remove');
    defineComponent(tag, () => ({ items }), { adapter: testReactivity });

    document.body.innerHTML = `
      <${tag}>
        <ul>
          <template x-for="item in items" x-key="item.id">
            <li x-text="item.id"></li>
          </template>
        </ul>
      </${tag}>
    `;

    await nextTick();

    const list = document.querySelector(`${tag} ul`) as HTMLUListElement;
    expect(list.querySelectorAll('li').length).toBe(2);

    setStore(items, [{ id: 'a' }, { id: 'b' }, { id: 'c' }]);
    await nextTick();
    expect(list.querySelectorAll('li').length).toBe(3);

    setStore(items, [{ id: 'a' }]);
    await nextTick();
    expect(list.querySelectorAll('li').length).toBe(1);
  });

  it('clears rendered nodes when the list becomes empty', async () => {
    const items = createStore([{ id: 'a' }]);
    const tag = nextTag('rwc-for-empty');
    defineComponent(tag, () => ({ items }), { adapter: testReactivity });

    document.body.innerHTML = `
      <${tag}>
        <ul>
          <template x-for="item in items" x-key="item.id">
            <li x-text="item.id"></li>
          </template>
        </ul>
      </${tag}>
    `;

    await nextTick();
    const list = document.querySelector(`${tag} ul`) as HTMLUListElement;
    expect(list.querySelectorAll('li').length).toBe(1);

    setStore(items, []);
    await nextTick();
    expect(list.querySelectorAll('li').length).toBe(0);
  });

  it('supports index aliases', async () => {
    const items = createStore(['a', 'b']);
    const tag = nextTag('rwc-for-index');
    defineComponent(tag, () => ({ items }), { adapter: testReactivity });

    document.body.innerHTML = `
      <${tag}>
        <ul>
          <template x-for="(item, idx) in items" x-key="item">
            <li x-text="idx"></li>
          </template>
        </ul>
      </${tag}>
    `;

    await nextTick();
    const list = document.querySelector(`${tag} ul`) as HTMLUListElement;
    const lis = Array.from(list.querySelectorAll('li'));
    expect(lis[0].textContent).toBe('0');
    expect(lis[1].textContent).toBe('1');
  });

  it('does not interfere with sibling elements', async () => {
    const items = createStore([{ id: 'a' }, { id: 'b' }]);
    const tag = nextTag('rwc-for-sibling');
    defineComponent(tag, () => ({ items }), { adapter: testReactivity });

    document.body.innerHTML = `
      <${tag}>
        <ul>
          <template x-for="item in items" x-key="item.id">
            <li x-text="item.id"></li>
          </template>
          <li class="sibling">Static</li>
        </ul>
      </${tag}>
    `;

    await nextTick();
    const list = document.querySelector(`${tag} ul`) as HTMLUListElement;
    const lis = Array.from(list.querySelectorAll('li'));
    expect(lis.length).toBe(3);
    expect(list.querySelector('.sibling')?.textContent).toBe('Static');
  });

  it('hydrates existing DOM without re-rendering', async () => {
    const items = createStore([
      { id: 'a', label: 'Alpha' },
      { id: 'b', label: 'Beta' }
    ]);
    const tag = nextTag('rwc-for-hydrate');
    defineComponent(tag, () => ({ items }), { adapter: testReactivity });

    document.body.innerHTML = `
      <${tag}>
        <ul>
          <template x-for="item in items" x-key="item.id">
            <li x-attr:data-id="item.id" x-text="item.label"></li>
          </template>
          <li data-id="a">Alpha</li>
          <li data-id="b">Beta</li>
        </ul>
      </${tag}>
    `;

    const list = document.querySelector(`${tag} ul`) as HTMLUListElement;
    const nodeA = list.querySelector('li[data-id="a"]') as HTMLLIElement;
    const nodeB = list.querySelector('li[data-id="b"]') as HTMLLIElement;

    await nextTick();

    const lis = Array.from(list.querySelectorAll('li'));
    expect(lis.length).toBe(2);
    expect(list.querySelector('li[data-id="a"]')).toBe(nodeA);
    expect(list.querySelector('li[data-id="b"]')).toBe(nodeB);
    expect(nodeA.textContent).toBe('Alpha');
    expect(nodeB.textContent).toBe('Beta');

    setStore(items, [
      { id: 'b', label: 'Beta' },
      { id: 'a', label: 'Alpha' }
    ]);
    await nextTick();

    const reordered = Array.from(list.querySelectorAll('li'));
    expect(reordered[0]).toBe(nodeB);
    expect(reordered[1]).toBe(nodeA);
  });

  it('hydrates nodes with directives without double-processing', async () => {
    const items = createStore([
      { id: 'a', label: 'Alpha', done: true },
      { id: 'b', label: 'Beta', done: false }
    ]);
    const tag = nextTag('rwc-for-hydrate-directives');
    defineComponent(tag, () => ({ items }), { adapter: testReactivity });

    document.body.innerHTML = `
      <${tag}>
        <ul>
          <template x-for="item in items" x-key="item.id">
            <li>
              <input type="checkbox" x-prop:checked="item.done">
              <span x-text="item.label"></span>
            </li>
          </template>
          <li data-id="a">
            <input type="checkbox" x-prop:checked="item.done" checked>
            <span x-text="item.label">Alpha</span>
          </li>
          <li data-id="b">
            <input type="checkbox" x-prop:checked="item.done">
            <span x-text="item.label">Beta</span>
          </li>
        </ul>
      </${tag}>
    `;

    await nextTick();

    const list = document.querySelector(`${tag} ul`) as HTMLUListElement;
    const nodeA = list.querySelector('li[data-id="a"]') as HTMLLIElement;
    const nodeB = list.querySelector('li[data-id="b"]') as HTMLLIElement;
    const inputA = nodeA.querySelector('input') as HTMLInputElement;
    const inputB = nodeB.querySelector('input') as HTMLInputElement;
    const spanA = nodeA.querySelector('span') as HTMLSpanElement;
    const spanB = nodeB.querySelector('span') as HTMLSpanElement;

    expect(spanA.textContent).toBe('Alpha');
    expect(spanB.textContent).toBe('Beta');
    expect(inputA.checked).toBe(true);
    expect(inputB.checked).toBe(false);
  });

  it('throws on duplicate keys', async () => {
    const items = createStore([
      { id: 'a' },
      { id: 'b' }
    ]);
    const tag = nextTag('rwc-for-dup');
    defineComponent(tag, () => ({ items }), { adapter: testReactivity });

    document.body.innerHTML = `
      <${tag}>
        <ul>
          <template x-for="item in items" x-key="item.id">
            <li x-text="item.id"></li>
          </template>
        </ul>
      </${tag}>
    `;

    await nextTick();

    expect(() => setStore(items, [{ id: 'a' }, { id: 'a' }])).toThrow(/duplicate key/i);
  });

  it('treats non-array values as an empty list', async () => {
    const items = createStore<unknown>(null);
    const tag = nextTag('rwc-for-nonarray');
    defineComponent(tag, () => ({ items }), { adapter: testReactivity });

    document.body.innerHTML = `
      <${tag}>
        <ul>
          <template x-for="item in items" x-key="item">
            <li x-text="item"></li>
          </template>
        </ul>
      </${tag}>
    `;
    await nextTick();

    const list = document.querySelector(`${tag} ul`) as HTMLUListElement;
    expect(list.querySelectorAll('li').length).toBe(0);

    setStore(items, ['a', 'b']);
    expect(list.querySelectorAll('li').length).toBe(2);

    setStore(items, 'not an array' as any);
    expect(list.querySelectorAll('li').length).toBe(0);
  });

  it('disposes child subscriptions when items are removed', async () => {
    const label = createStore('hello');
    const items = createStore([{ id: 'a' }]);
    const tag = nextTag('rwc-for-dispose');
    defineComponent(tag, () => ({ items, label }), { adapter: testReactivity });

    document.body.innerHTML = `
      <${tag}>
        <ul>
          <template x-for="item in items" x-key="item.id">
            <li x-text="label"></li>
          </template>
        </ul>
      </${tag}>
    `;
    await nextTick();

    const subsWithItem = label.subs.size;
    expect(subsWithItem).toBeGreaterThan(0);

    setStore(items, []);
    // The x-text inside the removed entry unsubscribes from label
    expect(label.subs.size).toBeLessThan(subsWithItem);
  });

  it('throws on invalid x-for expression syntax', () => {
    const template = document.createElement('template');
    template.setAttribute('x-for', 'notin');
    template.setAttribute('x-key', 'item');
    const ctx = createBindingContext({ items: [] }, testReactivity);
    expect(() => processFor(template, 'notin', ctx, () => {})).toThrow(/Invalid x-for/);
  });

  it('renders multiple root nodes per iteration', async () => {
    const items = createStore(['a', 'b']);
    const tag = nextTag('rwc-for-multi-root');
    defineComponent(tag, () => ({ items }), { adapter: testReactivity });

    document.body.innerHTML = `
      <${tag}>
        <div>
          <template x-for="item in items" x-key="item">
            <span x-text="item"></span>
            <hr>
          </template>
        </div>
      </${tag}>
    `;
    await nextTick();

    const container = document.querySelector(`${tag} div`) as HTMLDivElement;
    expect(container.querySelectorAll('span').length).toBe(2);
    expect(container.querySelectorAll('hr').length).toBe(2);

    setStore(items, ['a', 'b', 'c']);
    expect(container.querySelectorAll('span').length).toBe(3);
    expect(container.querySelectorAll('hr').length).toBe(3);
  });

  it('supports non-template elements', async () => {
    const items = createStore(['a', 'b']);
    const tag = nextTag('rwc-for-el');
    defineComponent(tag, () => ({ items }), { adapter: testReactivity });

    document.body.innerHTML = `
      <${tag}>
        <ul>
          <li x-for="item in items" x-key="item">
            <span x-text="item"></span>
          </li>
        </ul>
      </${tag}>
    `;

    await nextTick();

    const list = document.querySelector(`${tag} ul`) as HTMLUListElement;
    const lis = Array.from(list.querySelectorAll('li'));
    expect(lis.length).toBe(2);
    expect(lis[0].textContent?.trim()).toBe('a');
    expect(lis[1].textContent?.trim()).toBe('b');

    setStore(items, ['b', 'c']);
    await nextTick();

    const lisNext = Array.from(list.querySelectorAll('li'));
    expect(lisNext.length).toBe(2);
    expect(lisNext[0].textContent?.trim()).toBe('b');
    expect(lisNext[1].textContent?.trim()).toBe('c');
  });
});
