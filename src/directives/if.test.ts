import { describe, expect, it } from "vitest";
import { defineComponent } from "../test-define";
import { createStore, nextTag, nextTick, setStore } from "../test-utils";

describe("x-if directive", () => {
  it("mounts and disposes nested bindings", async () => {
    const show = createStore(true);
    const count = createStore(0);
    const tag = nextTag("rwc-if");
    defineComponent(tag, () => ({ show, count }));

    document.body.innerHTML = `<${tag}><template x-if="show"><span x-text="count"></span></template></${tag}>`;
    await nextTick();

    let span = document.querySelector(`${tag} span`) as HTMLSpanElement;
    expect(span.textContent).toBe("0");

    setStore(count, 1);
    expect(span.textContent).toBe("1");

    setStore(show, false);
    await nextTick();
    expect(document.querySelector(`${tag} span`)).toBeNull();
    expect(count.subs.size).toBe(0);

    setStore(count, 2);
    setStore(show, true);
    await nextTick();

    span = document.querySelector(`${tag} span`) as HTMLSpanElement;
    expect(span.textContent).toBe("2");
    expect(count.subs.size).toBe(1);
  });

  it("supports templates with multiple root nodes", async () => {
    const show = createStore(true);
    const tag = nextTag("rwc-if-multi");
    defineComponent(tag, () => ({ show }));

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

  it("starts unmounted when expression is initially falsy", async () => {
    const show = createStore(false);
    const tag = nextTag("rwc-if-false-init");
    defineComponent(tag, () => ({ show }));

    document.body.innerHTML = `<${tag}><template x-if="show"><span>Hi</span></template></${tag}>`;
    await nextTick();

    expect(document.querySelector(`${tag} span`)).toBeNull();

    setStore(show, true);
    expect(document.querySelector(`${tag} span`)?.textContent).toBe("Hi");

    setStore(show, false);
    expect(document.querySelector(`${tag} span`)).toBeNull();
  });

  it("handles nested x-if correctly", async () => {
    const outer = createStore(true);
    const inner = createStore(true);
    const tag = nextTag("rwc-if-nested");
    defineComponent(tag, () => ({ outer, inner }));

    document.body.innerHTML = `
      <${tag}>
        <template x-if="outer">
          <template x-if="inner">
            <span class="nested">Inside</span>
          </template>
        </template>
      </${tag}>
    `;
    await nextTick();
    expect(document.querySelector(`${tag} .nested`)?.textContent).toBe("Inside");

    setStore(inner, false);
    expect(document.querySelector(`${tag} .nested`)).toBeNull();

    setStore(inner, true);
    expect(document.querySelector(`${tag} .nested`)?.textContent).toBe("Inside");

    // Unmounting outer also removes inner content
    setStore(outer, false);
    expect(document.querySelector(`${tag} .nested`)).toBeNull();
  });

  it("binds x-text and x-attr on the same element as x-if", async () => {
    const show = createStore(true);
    const name = createStore("Alice");
    const title = createStore("greeting");
    const tag = nextTag("rwc-if-codir-text-attr");
    defineComponent(tag, () => ({ show, name, title }));

    document.body.innerHTML = `<${tag}><span x-if="show" x-text="name" x-attr:title="title"></span></${tag}>`;
    await nextTick();

    let span = document.querySelector(`${tag} span`) as HTMLSpanElement;
    expect(span.textContent).toBe("Alice");
    expect(span.getAttribute("title")).toBe("greeting");

    // both directives react while mounted
    setStore(name, "Bob");
    setStore(title, "farewell");
    expect(span.textContent).toBe("Bob");
    expect(span.getAttribute("title")).toBe("farewell");

    // unmount disposes both subscriptions
    setStore(show, false);
    expect(document.querySelector(`${tag} span`)).toBeNull();
    expect(name.subs.size).toBe(0);
    expect(title.subs.size).toBe(0);

    // re-mount picks up current values
    setStore(name, "Carol");
    setStore(show, true);
    span = document.querySelector(`${tag} span`) as HTMLSpanElement;
    expect(span.textContent).toBe("Carol");
    expect(span.getAttribute("title")).toBe("farewell");
  });

  it("binds x-class on the same element as x-if, preserving base classes across re-mounts", async () => {
    const show = createStore(true);
    const active = createStore(true);
    const tag = nextTag("rwc-if-codir-class");
    defineComponent(tag, () => ({ show, active }));

    document.body.innerHTML = `<${tag}><div class="card" x-if="show" x-class:active="active"></div></${tag}>`;
    await nextTick();

    let div = document.querySelector(`${tag} div`) as HTMLDivElement;
    expect(div.classList.contains("card")).toBe(true);
    expect(div.classList.contains("active")).toBe(true);

    setStore(active, false);
    expect(div.classList.contains("active")).toBe(false);

    // unmount + re-mount: each mount starts from a fresh template clone that has class="card"
    setStore(show, false);
    expect(document.querySelector(`${tag} div`)).toBeNull();

    setStore(show, true);
    div = document.querySelector(`${tag} div`) as HTMLDivElement;
    expect(div.classList.contains("card")).toBe(true);
    expect(div.classList.contains("active")).toBe(false);
  });

  it("binds x-on on the same element as x-if, disposing the listener on unmount", async () => {
    const show = createStore(true);
    const count = createStore(0);
    const tag = nextTag("rwc-if-codir-on");
    defineComponent(tag, () => ({
      show,
      count,
      inc() {
        setStore(count, count.value + 1);
      },
    }));

    document.body.innerHTML = `<${tag}><button x-if="show" x-on:click="inc" x-text="count"></button></${tag}>`;
    await nextTick();

    let btn = document.querySelector(`${tag} button`) as HTMLButtonElement;
    expect(btn.textContent).toBe("0");
    btn.click();
    expect(count.value).toBe(1);
    expect(btn.textContent).toBe("1");

    // unmount removes the listener; clicking the detached node is inert
    const detached = btn;
    setStore(show, false);
    expect(document.querySelector(`${tag} button`)).toBeNull();
    detached.click();
    expect(count.value).toBe(1);

    // re-mount attaches a fresh listener
    setStore(show, true);
    btn = document.querySelector(`${tag} button`) as HTMLButtonElement;
    expect(btn.textContent).toBe("1");
    btn.click();
    expect(count.value).toBe(2);
  });

  it("supports non-template elements", async () => {
    const show = createStore(true);
    const count = createStore(1);
    const tag = nextTag("rwc-if-el");
    defineComponent(tag, () => ({ show, count }));

    document.body.innerHTML = `<${tag}><p class="note" x-if="show"><span x-text="count"></span></p></${tag}>`;
    await nextTick();

    let note = document.querySelector(`${tag} .note`) as HTMLParagraphElement;
    expect(note).toBeTruthy();
    expect(note.textContent).toBe("1");

    setStore(show, false);
    await nextTick();
    expect(document.querySelector(`${tag} .note`)).toBeNull();
    expect(count.subs.size).toBe(0);

    setStore(count, 2);
    setStore(show, true);
    await nextTick();

    note = document.querySelector(`${tag} .note`) as HTMLParagraphElement;
    expect(note.textContent).toBe("2");
  });

  it("reuses existing non-template elements on initial true", async () => {
    const show = createStore(true);
    const label = createStore("Ready");
    const tag = nextTag("rwc-if-hydrate");
    defineComponent(tag, () => ({ show, label }));

    document.body.innerHTML = `<${tag}><div class="box" x-if="show" x-text="label"></div></${tag}>`;
    const initial = document.querySelector(`${tag} .box`) as HTMLDivElement;

    await nextTick();

    const after = document.querySelector(`${tag} .box`) as HTMLDivElement;
    expect(after).toBe(initial);
    expect(after.textContent).toBe("Ready");

    setStore(show, false);
    await nextTick();
    expect(document.querySelector(`${tag} .box`)).toBeNull();

    setStore(show, true);
    await nextTick();
    const remounted = document.querySelector(`${tag} .box`) as HTMLDivElement;
    expect(remounted).toBeTruthy();
    expect(remounted).not.toBe(initial);
  });

  it("clears SSR markers when mounted", async () => {
    const show = createStore(false);
    const tag = nextTag("rwc-if-ssr");
    defineComponent(tag, () => ({ show }));

    document.body.innerHTML = `<${tag}><div x-if="show" x-if-ssr="false"></div></${tag}>`;
    await nextTick();

    expect(document.querySelector(`${tag} div`)).toBeNull();

    setStore(show, true);
    await nextTick();

    const div = document.querySelector(`${tag} div`) as HTMLDivElement;
    expect(div).toBeTruthy();
    expect(div.hasAttribute("x-if-ssr")).toBe(false);
  });
});
