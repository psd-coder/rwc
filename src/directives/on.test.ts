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

  it('passes $event and $el to handlers', async () => {
    const tag = nextTag('rwc-on-event');
    let eventType = '';
    let elementTag = '';
    defineComponent(tag, () => ({
      handle(event: Event, el: Element) {
        eventType = event.type;
        elementTag = el.tagName;
      }
    }), { adapter: testReactivity });

    document.body.innerHTML = `<${tag}><button x-on:click="handle($event, $el)"></button></${tag}>`;
    const button = document.querySelector(`${tag} button`) as HTMLButtonElement;

    await nextTick();
    button.click();

    expect(eventType).toBe('click');
    expect(elementTag).toBe('BUTTON');
  });

  it('supports stop modifier', async () => {
    const count = createStore(0);
    const tag = nextTag('rwc-on-stop');
    defineComponent(tag, () => ({
      count,
      inc() {
        setStore(count, count.value + 1);
      }
    }), { adapter: testReactivity });

    document.body.innerHTML = `
      <${tag}>
        <div class="parent">
          <button x-on:click.stop="inc"></button>
        </div>
      </${tag}>
    `;
    const parent = document.querySelector(`${tag} .parent`) as HTMLDivElement;
    const button = document.querySelector(`${tag} button`) as HTMLButtonElement;
    let parentCalls = 0;
    parent.addEventListener('click', () => {
      parentCalls += 1;
    });

    await nextTick();
    button.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(count.value).toBe(1);
    expect(parentCalls).toBe(0);
  });

  it('supports capture modifier ordering', async () => {
    const tag = nextTag('rwc-on-capture');
    const calls: string[] = [];
    defineComponent(tag, () => ({
      outer() {
        calls.push('outer');
      },
      inner() {
        calls.push('inner');
      }
    }), { adapter: testReactivity });

    document.body.innerHTML = `
      <${tag}>
        <div class="outer" x-on:click.capture="outer">
          <button class="inner" x-on:click="inner"></button>
        </div>
      </${tag}>
    `;
    const button = document.querySelector(`${tag} .inner`) as HTMLButtonElement;

    await nextTick();
    button.click();

    expect(calls).toEqual(['outer', 'inner']);
  });

  it('supports multiple modifiers', async () => {
    const tag = nextTag('rwc-on-multi');
    let handled = 0;
    defineComponent(tag, () => ({
      handle() {
        handled += 1;
      }
    }), { adapter: testReactivity });

    document.body.innerHTML = `<${tag}><a href="#" x-on:click.prevent.stop.once="handle"></a></${tag}>`;
    const link = document.querySelector(`${tag} a`) as HTMLAnchorElement;

    await nextTick();
    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    link.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(handled).toBe(1);

    link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    expect(handled).toBe(1);
  });

  it('invokes function values when expression is not a call', async () => {
    const count = createStore(0);
    const tag = nextTag('rwc-on-fn');
    let boundThis: unknown;
    defineComponent(tag, () => ({
      count,
      inc(this: unknown) {
        boundThis = this;
        setStore(count, count.value + 1);
      }
    }), { adapter: testReactivity });

    document.body.innerHTML = `<${tag}><button x-on:click="inc"></button></${tag}>`;
    const button = document.querySelector(`${tag} button`) as HTMLButtonElement;

    await nextTick();
    button.click();

    expect(count.value).toBe(1);
    expect((boundThis as { count?: unknown })?.count).toBe(count);
  });

  it('removes listeners on disconnect', async () => {
    const count = createStore(0);
    const tag = nextTag('rwc-on-cleanup');
    defineComponent(tag, () => ({
      count,
      inc() {
        setStore(count, count.value + 1);
      }
    }), { adapter: testReactivity });

    document.body.innerHTML = `<${tag}><button x-on:click="inc"></button></${tag}>`;
    const host = document.querySelector(tag) as HTMLElement;
    const button = document.querySelector(`${tag} button`) as HTMLButtonElement;

    await nextTick();
    button.click();
    expect(count.value).toBe(1);

    host.remove();
    button.click();
    expect(count.value).toBe(1);
  });
});
