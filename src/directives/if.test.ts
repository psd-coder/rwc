import { describe, expect, it } from 'vitest';
import { defineComponent } from '../define';
import { registerAdapter, resetAdapterForTests } from '../adapters/registry';
import { createStore, nextTag, nextTick, setStore, testAdapter } from '../test-utils';

describe('x-if directive', () => {
  it('mounts and disposes nested bindings', async () => {
    resetAdapterForTests();
    registerAdapter(testAdapter);

    const show = createStore(true);
    const count = createStore(0);
    const tag = nextTag('rwc-if');
    defineComponent(tag, () => ({ show, count }));

    document.body.innerHTML = `<${tag}><template x-if="show"><span x-text="count"></span></template></${tag}>`;
    await nextTick();

    let span = document.querySelector(`${tag} span`) as HTMLSpanElement;
    expect(span.textContent).toBe('0');

    setStore(count, 1);
    expect(span.textContent).toBe('1');

    setStore(show, false);
    await nextTick();
    expect(document.querySelector(`${tag} span`)).toBeNull();
    expect(count.subs.size).toBe(0);

    setStore(count, 2);
    setStore(show, true);
    await nextTick();

    span = document.querySelector(`${tag} span`) as HTMLSpanElement;
    expect(span.textContent).toBe('2');
    expect(count.subs.size).toBe(1);
  });
});
