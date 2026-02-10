import { describe, expect, it } from "vitest";
import { defineComponent } from "../test-define";
import { nextTag, nextTick } from "../test-utils";

describe("x-cloak directive", () => {
  it("removes the attribute after init", async () => {
    const tag = nextTag("rwc-cloak");
    defineComponent(tag, () => ({}));

    document.body.innerHTML = `<${tag}><div x-cloak></div></${tag}>`;
    const div = document.querySelector(`${tag} div`) as HTMLDivElement;

    await nextTick();
    expect(div.hasAttribute("x-cloak")).toBe(false);
  });

  it("ignores elements without x-cloak", async () => {
    const tag = nextTag("rwc-cloak-none");
    defineComponent(tag, () => ({}));

    document.body.innerHTML = `<${tag}><div></div></${tag}>`;
    const div = document.querySelector(`${tag} div`) as HTMLDivElement;

    await nextTick();
    expect(div.hasAttribute("x-cloak")).toBe(false);
  });
});
