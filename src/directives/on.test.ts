import { describe, expect, it } from 'vitest';
import { defineComponent } from '../define';
import { createStore, nextTag, nextTick, setStore, testReactivity } from '../test-utils';

describe('x-on directive', () => {
  it('invokes handlers and respects modifiers', async () => {
    const count = createStore(0);
    const tag = nextTag('rwc-on');
    defineComponent(tag, () => ({
      count,
      inc() {
        setStore(count, count.value + 1);
      }
    }), { adapter: testReactivity });

    document.body.innerHTML = `<${tag}><button x-on:click.prevent.once="inc" x-text="count"></button></${tag}>`;
    const button = document.querySelector(`${tag} button`) as HTMLButtonElement;

    await nextTick();
    expect(button.textContent).toBe('0');

    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    button.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(button.textContent).toBe('1');

    button.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    expect(button.textContent).toBe('1');
  });
});
