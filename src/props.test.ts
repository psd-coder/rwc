import { describe, expect, it } from 'vitest';
import { defineComponent } from './define';
import { createStore, nextTag, nextTick, setStore, testReactivity, type Store } from './test-utils';

describe('component props', () => {
  it('passes store props through for custom elements', async () => {
    const parentTag = nextTag('rwc-props-parent');
    const childTag = nextTag('rwc-props-child');
    const $item = createStore({ id: 1, text: 'alpha' });

    defineComponent<{ $item: Store<{ id: number; text: string }> }>(childTag, (ctx) => {
      const host = ctx.host as { __prop?: unknown; __hostProp?: unknown };
      const hostElement = ctx.host as HTMLElement & { $item?: unknown };
      host.__prop = ctx.props.$item;
      host.__hostProp = hostElement.$item;
      return {};
    }, { adapter: testReactivity, props: ['$item'] });

    defineComponent(parentTag, () => ({ $item }), { adapter: testReactivity });

    document.body.innerHTML = `<${parentTag}><${childTag} x-prop:$item="$item"></${childTag}></${parentTag}>`;
    await nextTick();

    const child = document.querySelector(childTag) as HTMLElement & { __prop?: unknown; __hostProp?: unknown };
    expect(child.__prop).toBe($item);
    expect(child.__hostProp).toBe($item);
    expect(child.__prop).not.toBe($item.value);
  });

  it('wraps plain props in reactive stores and propagates updates', async () => {
    const parentTag = nextTag('rwc-props-parent');
    const childTag = nextTag('rwc-props-child');
    const label = createStore('Alpha');

    defineComponent<{ title: Store<string> }>(childTag, (ctx) => {
      const host = ctx.host as { __isStore?: boolean; __value?: unknown };
      host.__isStore = testReactivity.isStore(ctx.props.title);
      ctx.effect(ctx.props.title, (value) => {
        host.__value = value;
      });
      return {};
    }, { adapter: testReactivity, props: ['title'] });

    defineComponent(parentTag, () => ({ label }), { adapter: testReactivity });

    document.body.innerHTML = `<${parentTag}><${childTag} x-prop:title="label + '!'"></${childTag}></${parentTag}>`;
    await nextTick();

    const child = document.querySelector(childTag) as HTMLElement & { __isStore?: boolean; __value?: unknown };
    expect(child.__isStore).toBe(true);
    expect(child.__value).toBe('Alpha!');

    setStore(label, 'Beta');
    expect(child.__value).toBe('Beta!');
  });

  it('treats custom elements as directive boundaries', async () => {
    const parentTag = nextTag('rwc-boundary-parent');
    const childTag = nextTag('rwc-boundary-child');
    const parentValue = createStore('parent');
    const childValue = createStore('child');

    defineComponent(parentTag, () => ({ value: parentValue }), { adapter: testReactivity });
    defineComponent(childTag, () => ({ value: childValue }), { adapter: testReactivity });

    document.body.innerHTML = `<${parentTag}><${childTag}><span x-text="value"></span></${childTag}></${parentTag}>`;
    await nextTick();

    const span = document.querySelector(`${childTag} span`) as HTMLSpanElement;
    expect(span.textContent).toBe('child');
  });

  it('supports x-for with store props and child interactions', async () => {
    const parentTag = nextTag('rwc-flow-parent');
    const childTag = nextTag('rwc-flow-child');

    type Item = { id: number; text: string; completed: boolean };

    const $items = createStore<Store<Item>[]>([
      createStore<Item>({ id: 1, text: 'First', completed: false }),
      createStore<Item>({ id: 2, text: 'Second', completed: false })
    ]);
    const $newTodo = createStore('');

    defineComponent<{ $item: Store<Item> }>(childTag, (ctx) => {
      const $item = ctx.props.$item;

      const toggle = () => {
        const current = $item.value;
        setStore($item, { ...current, completed: !current.completed });
      };

      const remove = () => {
        setStore($items, $items.value.filter((entry) => entry !== $item));
      };

      return { $item, toggle, remove };
    }, { adapter: testReactivity, props: ['$item'] });

    defineComponent(parentTag, (ctx) => {
      const addTodo = () => {
        const text = $newTodo.value.trim();
        if (!text) return;
        const next = createStore<Item>({ id: Date.now(), text, completed: false });
        setStore($items, [...$items.value, next]);
        setStore($newTodo, '');
        ctx.$refs.input?.focus();
      };

      ctx.on(ctx.$refs.input, 'keydown', (event: KeyboardEvent) => {
        if (event.key === 'Enter') addTodo();
      });

      return { $items, $newTodo, addTodo };
    }, { adapter: testReactivity });

    document.body.innerHTML = `
      <${parentTag}>
        <input x-ref="input" type="text" x-prop:value="$newTodo" />
        <button class="btn-add" x-on:click="addTodo()">Add</button>
        <div class="todos" x-show="$items.length > 0">
          <${childTag} x-for="$item in $items" x-key="$item.id" x-prop:$item="$item">
            <div class="todo-item">
              <input type="checkbox" x-prop:checked="$item.completed" x-on:change="toggle()" />
              <span class="todo-text" x-text="$item.text" x-class="{ completed: $item.completed }"></span>
              <button class="btn-delete" x-on:click="remove()">Delete</button>
            </div>
          </${childTag}>
        </div>
      </${parentTag}>
    `;

    await nextTick();

    let items = document.querySelectorAll(childTag);
    expect(items.length).toBe(2);

    const firstCheckbox = items[0].querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(firstCheckbox.checked).toBe(false);
    firstCheckbox.dispatchEvent(new Event('change', { bubbles: true }));
    expect(firstCheckbox.checked).toBe(true);

    const secondDelete = items[1].querySelector('.btn-delete') as HTMLButtonElement;
    secondDelete.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    items = document.querySelectorAll(childTag);
    expect(items.length).toBe(1);

    setStore($newTodo, 'New item');
    const addButton = document.querySelector(`${parentTag} .btn-add`) as HTMLButtonElement;
    addButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    items = document.querySelectorAll(childTag);
    expect(items.length).toBe(2);
  });
});
