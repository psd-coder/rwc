import { describe, expect, it } from 'vitest';
import { defineComponent } from '../define';
import { nextTag, nextTick, testReactivity } from '../test-utils';

describe('x-ref directive', () => {
  it('exposes static refs during setup', async () => {
    const tag = nextTag('rwc-ref-setup');
    defineComponent(tag, (ctx) => {
      (ctx.host as { __ref?: HTMLElement }).__ref = ctx.$refs.field;
      return {};
    }, { adapter: testReactivity });

    document.body.innerHTML = `<${tag}><input x-ref="field" /></${tag}>`;
    await nextTick();

    const host = document.querySelector(tag) as HTMLElement & { __ref?: HTMLElement };
    const input = document.querySelector(`${tag} input`) as HTMLInputElement;

    expect(host.__ref).toBe(input);
  });

  it('registers and cleans up refs', async () => {
    const tag = nextTag('rwc-ref');
    defineComponent(tag, (ctx) => {
      (ctx.host as { __ctx?: unknown }).__ctx = ctx;
      return {};
    }, { adapter: testReactivity });

    document.body.innerHTML = `<${tag}><input x-ref="field" /></${tag}>`;
    await nextTick();

    const host = document.querySelector(tag) as HTMLElement & { __ctx?: { $refs: Record<string, HTMLElement> } };
    const input = document.querySelector(`${tag} input`) as HTMLInputElement;

    expect(host.__ctx?.$refs.field).toBe(input);

    host.remove();
    expect(host.__ctx?.$refs.field).toBeUndefined();
  });

  it('registers multiple refs', async () => {
    const tag = nextTag('rwc-ref-multi');
    defineComponent(tag, (ctx) => {
      (ctx.host as { __ctx?: unknown }).__ctx = ctx;
      return {};
    }, { adapter: testReactivity });

    document.body.innerHTML = `
      <${tag}>
        <input x-ref="first" />
        <button x-ref="second"></button>
      </${tag}>
    `;
    await nextTick();

    const host = document.querySelector(tag) as HTMLElement & { __ctx?: { $refs: Record<string, HTMLElement> } };
    const input = document.querySelector(`${tag} input`) as HTMLInputElement;
    const button = document.querySelector(`${tag} button`) as HTMLButtonElement;

    expect(host.__ctx?.$refs.first).toBe(input);
    expect(host.__ctx?.$refs.second).toBe(button);
  });
});
