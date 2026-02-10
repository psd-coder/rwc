import { describe, expect, it } from "vitest";
import { defineComponent } from "../test-define";
import { createStore, nextTag, nextTick, setStore } from "../test-utils";

describe("x-prop directive", () => {
  it("sets properties from literal expressions", async () => {
    const tag = nextTag("rwc-prop-literal");
    defineComponent(tag, () => ({}));

    document.body.innerHTML = `<${tag}><input x-prop:value="'hello'" /></${tag}>`;
    const input = document.querySelector(`${tag} input`) as HTMLInputElement;

    await nextTick();
    expect(input.value).toBe("hello");
  });

  it("updates element properties", async () => {
    const value = createStore("alpha");
    const tag = nextTag("rwc-prop");
    defineComponent(tag, () => ({ value }));

    document.body.innerHTML = `<${tag}><input x-prop:value="value" /></${tag}>`;
    const input = document.querySelector(`${tag} input`) as HTMLInputElement;

    await nextTick();
    expect(input.value).toBe("alpha");

    setStore(value, "beta");
    expect(input.value).toBe("beta");
  });

  it("assigns null and undefined directly to properties", async () => {
    const val = createStore<unknown>("test");
    const tag = nextTag("rwc-prop-nullish");
    defineComponent(tag, () => ({ val }));

    // HTML lowercases attribute names, so use all-lowercase prop
    document.body.innerHTML = `<${tag}><div x-prop:customprop="val"></div></${tag}>`;
    const div = document.querySelector(`${tag} div`) as HTMLDivElement;

    await nextTick();
    expect((div as any).customprop).toBe("test");

    setStore(val, null);
    expect((div as any).customprop).toBeNull();

    setStore(val, undefined);
    expect((div as any).customprop).toBeUndefined();
  });

  it("updates boolean properties", async () => {
    const checked = createStore(false);
    const tag = nextTag("rwc-prop-checked");
    defineComponent(tag, () => ({ checked }));

    document.body.innerHTML = `<${tag}><input type="checkbox" x-prop:checked="checked" /></${tag}>`;
    const input = document.querySelector(`${tag} input`) as HTMLInputElement;

    await nextTick();
    expect(input.checked).toBe(false);

    setStore(checked, true);
    expect(input.checked).toBe(true);
  });

  it("keeps manual property updates until source changes again", async () => {
    const tag = nextTag("rwc-prop-rerun");
    defineComponent(tag, (ctx) => {
      const host = ctx.host as HTMLElement & { setSource?: (next: string) => void };
      let source = "alpha";
      host.setSource = (next: string) => {
        source = next;
      };
      return {
        current() {
          return source;
        },
      };
    });

    document.body.innerHTML = `<${tag}><input x-prop:value="current()" /></${tag}>`;
    const host = document.querySelector(tag) as HTMLElement & {
      setSource?: (next: string) => void;
    };
    const input = document.querySelector(`${tag} input`) as HTMLInputElement;

    await nextTick();
    expect(input.value).toBe("alpha");

    host.setSource?.("beta");
    input.value = "manual";
    expect(input.value).toBe("manual");
  });

  it("supports programmatic prop updates through nested components", async () => {
    const parentTag = nextTag("rwc-prop-parent");
    const childTag = nextTag("rwc-prop-child");
    const mode = createStore("one");

    defineComponent<{ value: string }>(childTag, (ctx) => {
      const host = ctx.host as HTMLElement & { value?: unknown };
      ctx.effect(ctx.props.value, (value) => {
        host.dataset.value = String(value);
      });
      return {};
    });

    defineComponent(parentTag, () => ({ mode }));

    document.body.innerHTML = `<${parentTag}><${childTag} x-prop:value="mode + ''"></${childTag}></${parentTag}>`;
    const child = document.querySelector(childTag) as HTMLElement & { value?: string };

    await nextTick();
    expect(child.dataset.value).toBe("one");

    setStore(mode, "two");
    expect(child.dataset.value).toBe("two");

    child.value = "manual";
    expect(child.dataset.value).toBe("manual");
    expect(child.value).toBe("manual");

    setStore(mode, "three");
    expect(child.dataset.value).toBe("three");
    expect(child.value).toBe("three");
  });
});
