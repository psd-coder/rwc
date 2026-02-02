import { describe, expect, it } from 'vitest';
import { defineComponent } from '../define';
import { registerAdapter, resetAdapterForTests } from '../adapters/registry';
import { nextTag, nextTick, testAdapter } from '../test-utils';

describe('x-ref directive', () => {
  it('exposes static refs during setup', async () => {
    resetAdapterForTests();
    registerAdapter(testAdapter);

    const tag = nextTag('rwc-ref-setup');
    defineComponent(tag, (ctx) => {
      (ctx.host as { __ref?: HTMLElement }).__ref = ctx.$refs.field;
      return {};
    });

    document.body.innerHTML = `<${tag}><input x-ref="field" /></${tag}>`;
    await nextTick();

    const host = document.querySelector(tag) as HTMLElement & { __ref?: HTMLElement };
    const input = document.querySelector(`${tag} input`) as HTMLInputElement;

    expect(host.__ref).toBe(input);
  });

  it('registers and cleans up refs', async () => {
    resetAdapterForTests();
    registerAdapter(testAdapter);

    const tag = nextTag('rwc-ref');
    defineComponent(tag, (ctx) => {
      (ctx.host as { __ctx?: unknown }).__ctx = ctx;
      return {};
    });

    document.body.innerHTML = `<${tag}><input x-ref="field" /></${tag}>`;
    await nextTick();

    const host = document.querySelector(tag) as HTMLElement & { __ctx?: { $refs: Record<string, HTMLElement> } };
    const input = document.querySelector(`${tag} input`) as HTMLInputElement;

    expect(host.__ctx?.$refs.field).toBe(input);

    host.remove();
    expect(host.__ctx?.$refs.field).toBeUndefined();
  });
});
