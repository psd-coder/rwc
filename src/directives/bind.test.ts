import { describe, expect, it } from "vitest";
import { defineComponent } from "../test-define";
import { createStore, nextTag, nextTick, setStore } from "../test-utils";

describe("x-bind directive", () => {
  it("syncs input value both ways with shorthand store targets", async () => {
    const title = createStore("alpha");
    const tag = nextTag("rwc-bind-value");
    defineComponent(tag, () => ({ title }));

    document.body.innerHTML = `<${tag}><input x-bind:value="title" /></${tag}>`;
    const input = document.querySelector(`${tag} input`) as HTMLInputElement;

    await nextTick();
    expect(input.value).toBe("alpha");

    input.value = "beta";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    expect(title.value).toBe("beta");

    setStore(title, "gamma");
    expect(input.value).toBe("gamma");
  });

  it("uses change event for checked bindings by default", async () => {
    const checked = createStore(false);
    const tag = nextTag("rwc-bind-checked");
    defineComponent(tag, () => ({ checked }));

    document.body.innerHTML = `<${tag}><input type="checkbox" x-bind:checked="checked" /></${tag}>`;
    const input = document.querySelector(`${tag} input`) as HTMLInputElement;

    await nextTick();
    expect(input.checked).toBe(false);

    input.checked = true;
    input.dispatchEvent(new Event("change", { bubbles: true }));
    expect(checked.value).toBe(true);

    setStore(checked, false);
    expect(input.checked).toBe(false);
  });

  it("supports explicit getter/setter object bindings", async () => {
    const title = createStore("alpha");
    const tag = nextTag("rwc-bind-get-set");
    const setterCalls: unknown[] = [];
    defineComponent(tag, () => ({
      title,
      setTitle(next: unknown) {
        setterCalls.push(next);
        setStore(title, String(next).trim());
      },
    }));

    document.body.innerHTML = `<${tag}><input x-bind:value="{ get: title + '!', set: setTitle }" /></${tag}>`;
    const input = document.querySelector(`${tag} input`) as HTMLInputElement;

    await nextTick();
    expect(input.value).toBe("alpha!");

    input.value = " beta ";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    expect(setterCalls).toEqual([" beta "]);
    expect(title.value).toBe("beta");
    expect(input.value).toBe("beta!");
  });

  it("supports custom binding events and setter call expressions", async () => {
    const value = createStore("A");
    const tag = nextTag("rwc-bind-event");
    let callCount = 0;
    defineComponent(tag, () => ({
      value,
      assign(next: unknown, event: Event) {
        if (event.type === "change") {
          callCount += 1;
        }
        setStore(value, String(next));
      },
    }));

    document.body.innerHTML = `
      <${tag}>
        <input x-bind:value.change="{ get: value, set: assign($value, $event) }" />
      </${tag}>
    `;
    const input = document.querySelector(`${tag} input`) as HTMLInputElement;

    await nextTick();
    expect(input.value).toBe("A");

    input.value = "B";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    expect(value.value).toBe("A");
    expect(callCount).toBe(0);

    input.value = "C";
    input.dispatchEvent(new Event("change", { bubbles: true }));
    expect(value.value).toBe("C");
    expect(callCount).toBe(1);
  });

  it("throws for shorthand bindings without writable targets", async () => {
    const title = createStore("alpha");
    const tag = nextTag("rwc-bind-invalid");
    defineComponent(tag, () => ({ title }));

    document.body.innerHTML = `<${tag}><input x-bind:value="title + '!'" /></${tag}>`;
    const input = document.querySelector(`${tag} input`) as HTMLInputElement;

    await nextTick();
    input.value = "beta";
    expect(() => input.dispatchEvent(new Event("input", { bubbles: true }))).toThrow(
      /writable store target with set\(value\)/,
    );
  });
});
