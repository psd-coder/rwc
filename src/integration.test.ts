import { describe, expect, it } from 'vitest';
import { defineComponent } from './define';
import { registerAdapter, resetAdapterForTests } from './adapters/registry';
import { createStore, nextTag, nextTick, setStore, testAdapter } from './test-utils';

describe('integration', () => {
  it('wires multiple directives together', async () => {
    resetAdapterForTests();
    registerAdapter(testAdapter);

    const count = createStore(0);
    const visible = createStore(true);
    const tag = nextTag('rwc-int');
    defineComponent(tag, () => ({
      count,
      visible,
      inc() {
        setStore(count, count.value + 1);
      }
    }));

    document.body.innerHTML = `
      <${tag}>
        <button x-on:click="inc" x-text="count"></button>
        <div id="panel" x-show="visible" x-class="{ active: visible }" x-attr:data-count="count"></div>
      </${tag}>
    `;

    await nextTick();

    const button = document.querySelector(`${tag} button`) as HTMLButtonElement;
    const panel = document.querySelector(`${tag} #panel`) as HTMLDivElement;

    expect(button.textContent).toBe('0');
    expect(panel.dataset.count).toBe('0');
    expect(panel.classList.contains('active')).toBe(true);

    button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(button.textContent).toBe('1');
    expect(panel.dataset.count).toBe('1');

    setStore(visible, false);
    expect(panel.style.display).toBe('none');
    expect(panel.classList.contains('active')).toBe(false);

    setStore(visible, true);
    expect(panel.style.display).toBe('');
    expect(panel.classList.contains('active')).toBe(true);
  });
});
