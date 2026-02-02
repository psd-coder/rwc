import { describe, expect, it } from 'vitest';
import { defineComponent } from '../define';
import { registerAdapter, resetAdapterForTests } from '../adapters/registry';
import { createStore, nextTag, nextTick, setStore, testAdapter } from '../test-utils';

describe('x-portal directive', () => {
  it('moves content to target and cleans up', async () => {
    resetAdapterForTests();
    registerAdapter(testAdapter);

    const label = createStore('Hello');
    const tag = nextTag('rwc-portal');
    defineComponent(tag, () => ({ label }));

    document.body.innerHTML = `
      <div id="portal-target"></div>
      <${tag}>
        <template x-portal="#portal-target">
          <span x-text="label"></span>
        </template>
      </${tag}>
    `;

    await nextTick();

    const target = document.querySelector('#portal-target') as HTMLDivElement;
    const span = target.querySelector('span') as HTMLSpanElement;
    expect(span.textContent).toBe('Hello');

    setStore(label, 'Updated');
    expect(span.textContent).toBe('Updated');

    const host = document.querySelector(tag) as HTMLElement;
    host.remove();
    expect(target.querySelector('span')).toBeNull();
  });
});
