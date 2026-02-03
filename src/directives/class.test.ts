import { describe, expect, it } from 'vitest';
import { defineComponent } from '../define';
import { createStore, nextTag, nextTick, setStore, testReactivity } from '../test-utils';

describe('x-class directive', () => {
  it('merges classes with clsx input', async () => {
    const isActive = createStore(true);
    const tag = nextTag('rwc-class');
    defineComponent(tag, () => ({ isActive }), { adapter: testReactivity });

    document.body.innerHTML = `<${tag}><div class="base" x-class="{ active: isActive }"></div></${tag}>`;
    const div = document.querySelector(`${tag} div`) as HTMLDivElement;

    await nextTick();
    expect(div.classList.contains('base')).toBe(true);
    expect(div.classList.contains('active')).toBe(true);

    setStore(isActive, false);
    expect(div.classList.contains('active')).toBe(false);
  });

  it('toggles class modifiers', async () => {
    const visible = createStore(true);
    const tag = nextTag('rwc-class-mod');
    defineComponent(tag, () => ({ visible }), { adapter: testReactivity });

    document.body.innerHTML = `<${tag}><div x-class:highlight="visible"></div></${tag}>`;
    const div = document.querySelector(`${tag} div`) as HTMLDivElement;

    await nextTick();
    expect(div.classList.contains('highlight')).toBe(true);

    setStore(visible, false);
    expect(div.classList.contains('highlight')).toBe(false);
  });

  it('keeps base classes stable across x-for rebinds', async () => {
    const todos = createStore([{ id: 1, completed: false }]);
    const tag = nextTag('rwc-class-for');
    defineComponent(tag, () => ({ todos }), { adapter: testReactivity });

    document.body.innerHTML = `<${tag}><template x-for="todo in todos" x-key="todo.id"><span class="todo-text" x-class="{ completed: todo.completed }"></span></template></${tag}>`;
    await nextTick();

    let span = document.querySelector(`${tag} .todo-text`) as HTMLSpanElement;
    expect(span.classList.contains('completed')).toBe(false);

    setStore(todos, [{ id: 1, completed: true }]);
    await nextTick();
    span = document.querySelector(`${tag} .todo-text`) as HTMLSpanElement;
    expect(span.classList.contains('completed')).toBe(true);

    setStore(todos, [{ id: 1, completed: false }]);
    await nextTick();
    span = document.querySelector(`${tag} .todo-text`) as HTMLSpanElement;
    expect(span.classList.contains('completed')).toBe(false);
  });
});
