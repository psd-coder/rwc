import { describe, expect, it } from 'vitest';
import { defineComponent } from '../define';
import { registerAdapter, resetAdapterForTests } from '../adapters/registry';
import { createStore, nextTag, nextTick, setStore, testAdapter } from '../test-utils';

describe('x-class directive', () => {
  it('merges classes with clsx input', async () => {
    resetAdapterForTests();
    registerAdapter(testAdapter);

    const isActive = createStore(true);
    const tag = nextTag('rwc-class');
    defineComponent(tag, () => ({ isActive }));

    document.body.innerHTML = `<${tag}><div class="base" x-class="{ active: isActive }"></div></${tag}>`;
    const div = document.querySelector(`${tag} div`) as HTMLDivElement;

    await nextTick();
    expect(div.classList.contains('base')).toBe(true);
    expect(div.classList.contains('active')).toBe(true);

    setStore(isActive, false);
    expect(div.classList.contains('active')).toBe(false);
  });

  it('toggles class modifiers', async () => {
    resetAdapterForTests();
    registerAdapter(testAdapter);

    const visible = createStore(true);
    const tag = nextTag('rwc-class-mod');
    defineComponent(tag, () => ({ visible }));

    document.body.innerHTML = `<${tag}><div x-class:highlight="visible"></div></${tag}>`;
    const div = document.querySelector(`${tag} div`) as HTMLDivElement;

    await nextTick();
    expect(div.classList.contains('highlight')).toBe(true);

    setStore(visible, false);
    expect(div.classList.contains('highlight')).toBe(false);
  });
});
