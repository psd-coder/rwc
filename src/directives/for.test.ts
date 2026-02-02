import { describe, expect, it } from 'vitest';
import { defineComponent } from '../define';
import { registerAdapter, resetAdapterForTests } from '../adapters/registry';
import { createStore, nextTag, nextTick, setStore, testAdapter } from '../test-utils';

describe('x-for directive', () => {
  it('renders and reorders keyed items', async () => {
    resetAdapterForTests();
    registerAdapter(testAdapter);

    const items = createStore([
      { id: 'a' },
      { id: 'b' }
    ]);
    const tag = nextTag('rwc-for');
    defineComponent(tag, () => ({ items }));

    document.body.innerHTML = `
      <${tag}>
        <ul>
          <template x-for="item in items">
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

  it('hydrates existing DOM without re-rendering', async () => {
    resetAdapterForTests();
    registerAdapter(testAdapter);

    const items = createStore([
      { id: 'a', label: 'Alpha' },
      { id: 'b', label: 'Beta' }
    ]);
    const tag = nextTag('rwc-for-hydrate');
    defineComponent(tag, () => ({ items }));

    document.body.innerHTML = `
      <${tag}>
        <ul>
          <template x-for="item in items">
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

  it('supports non-template elements', async () => {
    resetAdapterForTests();
    registerAdapter(testAdapter);

    const items = createStore(['a', 'b']);
    const tag = nextTag('rwc-for-el');
    defineComponent(tag, () => ({ items }));

    document.body.innerHTML = `
      <${tag}>
        <ul>
          <li x-for="item in items">
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
