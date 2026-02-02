import { describe, expect, it } from 'vitest';
import { defineComponent } from '../define';
import { registerAdapter, resetAdapterForTests } from '../adapters/registry';
import { createStore, nextTag, nextTick, setStore, testAdapter } from '../test-utils';

describe('x-show directive', () => {
  it('toggles display style', async () => {
    resetAdapterForTests();
    registerAdapter(testAdapter);

    const visible = createStore(true);
    const tag = nextTag('rwc-show');
    defineComponent(tag, () => ({ visible }));

    document.body.innerHTML = `<${tag}><div style="display: inline-block" x-show="visible"></div></${tag}>`;
    const div = document.querySelector(`${tag} div`) as HTMLDivElement;

    await nextTick();
    expect(div.style.display).toBe('inline-block');

    setStore(visible, false);
    expect(div.style.display).toBe('none');

    setStore(visible, true);
    expect(div.style.display).toBe('inline-block');
  });
});
