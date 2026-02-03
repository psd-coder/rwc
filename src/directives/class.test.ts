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
});
