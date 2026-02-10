import { describe, expect, it } from "vitest";
import { defineComponent } from "../test-define";
import { createStore, nextTag, nextTick, setStore } from "../test-utils";

describe("x-class directive", () => {
  it("merges object-based dynamic classes with base classes", async () => {
    const isActive = createStore(true);
    const tag = nextTag("rwc-class");
    defineComponent(tag, () => ({ isActive }));

    document.body.innerHTML = `<${tag}><div class="base" x-class="{ active: isActive }"></div></${tag}>`;
    const div = document.querySelector(`${tag} div`) as HTMLDivElement;

    await nextTick();
    expect(div.classList.contains("base")).toBe(true);
    expect(div.classList.contains("active")).toBe(true);

    setStore(isActive, false);
    expect(div.classList.contains("active")).toBe(false);
  });

  it("removes base classes when object syntax sets them to false", async () => {
    const completed = createStore(false);
    const tag = nextTag("rwc-class-base-override");
    defineComponent(tag, () => ({ completed }));

    document.body.innerHTML = `<${tag}><div class="base completed" x-class="{ completed: completed }"></div></${tag}>`;
    const div = document.querySelector(`${tag} div`) as HTMLDivElement;

    await nextTick();
    expect(div.classList.contains("base")).toBe(true);
    expect(div.classList.contains("completed")).toBe(false);

    setStore(completed, true);
    expect(div.classList.contains("completed")).toBe(true);

    setStore(completed, false);
    expect(div.classList.contains("completed")).toBe(false);
  });

  it("toggles class modifiers", async () => {
    const visible = createStore(true);
    const tag = nextTag("rwc-class-mod");
    defineComponent(tag, () => ({ visible }));

    document.body.innerHTML = `<${tag}><div x-class:highlight="visible"></div></${tag}>`;
    const div = document.querySelector(`${tag} div`) as HTMLDivElement;

    await nextTick();
    expect(div.classList.contains("highlight")).toBe(true);

    setStore(visible, false);
    expect(div.classList.contains("highlight")).toBe(false);
  });

  it("supports one-level array syntax", async () => {
    const size = createStore("lg");
    const tag = nextTag("rwc-class-array");
    defineComponent(tag, () => ({ size }));

    document.body.innerHTML = `<${tag}><div x-class="['btn', size]"></div></${tag}>`;
    const div = document.querySelector(`${tag} div`) as HTMLDivElement;

    await nextTick();
    expect(div.classList.contains("btn")).toBe(true);
    expect(div.classList.contains("lg")).toBe(true);

    setStore(size, "sm");
    expect(div.classList.contains("lg")).toBe(false);
    expect(div.classList.contains("sm")).toBe(true);
  });

  it("supports string/object entries in arrays and filters falsy values", async () => {
    const size = createStore("lg");
    const active = createStore(false);
    const tag = nextTag("rwc-class-array-mixed");
    defineComponent(tag, () => ({ size, active }));

    document.body.innerHTML = `<${tag}><div class="base active" x-class="[size, active && 'active', { active: active, pending: false }, '', false]"></div></${tag}>`;
    const div = document.querySelector(`${tag} div`) as HTMLDivElement;

    await nextTick();
    expect(div.classList.contains("base")).toBe(true);
    expect(div.classList.contains("lg")).toBe(true);
    expect(div.classList.contains("active")).toBe(false);
    expect(div.classList.contains("pending")).toBe(false);

    setStore(active, true);
    expect(div.classList.contains("active")).toBe(true);

    setStore(size, "");
    expect(div.classList.contains("lg")).toBe(false);
  });

  it("supports conditional expressions", async () => {
    const count = createStore(5);
    const tag = nextTag("rwc-class-conditional");
    defineComponent(tag, () => ({ count }));

    document.body.innerHTML = `<${tag}><div x-class="count > 3 ? 'high' : 'low'"></div></${tag}>`;
    const div = document.querySelector(`${tag} div`) as HTMLDivElement;

    await nextTick();
    expect(div.classList.contains("high")).toBe(true);
    expect(div.classList.contains("low")).toBe(false);

    setStore(count, 2);
    expect(div.classList.contains("high")).toBe(false);
    expect(div.classList.contains("low")).toBe(true);
  });

  it("keeps base classes stable across x-for rebinds", async () => {
    const todos = createStore([{ id: 1, completed: false }]);
    const tag = nextTag("rwc-class-for");
    defineComponent(tag, () => ({ todos }));

    document.body.innerHTML = `<${tag}><template x-for="todo in todos" x-key="todo.id"><span class="todo-text" x-class="{ completed: todo.completed }"></span></template></${tag}>`;
    await nextTick();

    let span = document.querySelector(`${tag} .todo-text`) as HTMLSpanElement;
    expect(span.classList.contains("completed")).toBe(false);

    setStore(todos, [{ id: 1, completed: true }]);
    await nextTick();
    span = document.querySelector(`${tag} .todo-text`) as HTMLSpanElement;
    expect(span.classList.contains("completed")).toBe(true);

    setStore(todos, [{ id: 1, completed: false }]);
    await nextTick();
    span = document.querySelector(`${tag} .todo-text`) as HTMLSpanElement;
    expect(span.classList.contains("completed")).toBe(false);
  });
});
