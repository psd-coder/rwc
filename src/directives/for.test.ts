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
});
