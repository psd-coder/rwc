import { describe, expect, it } from 'vitest';
import { defineComponent } from '../define';
import { createStore, nextTag, nextTick, setStore, testReactivity } from '../test-utils';

describe('x-text directive', () => {
  it('renders and updates text content', async () => {
    const count = createStore(1);
    const tag = nextTag('rwc-text');
    defineComponent(tag, () => ({ count }), { adapter: testReactivity });

    document.body.innerHTML = `<${tag}><span x-text="count"></span></${tag}>`;

    const span = document.querySelector(`${tag} span`) as HTMLSpanElement;
    await nextTick();
    expect(span.textContent).toBe('1');

    setStore(count, 3);
    expect(span.textContent).toBe('3');
  });
});
