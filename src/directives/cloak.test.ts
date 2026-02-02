import { describe, expect, it } from 'vitest';
import { defineComponent } from '../define';
import { registerAdapter, resetAdapterForTests } from '../adapters/registry';
import { nextTag, nextTick, testAdapter } from '../test-utils';

describe('x-cloak directive', () => {
  it('removes the attribute after init', async () => {
    resetAdapterForTests();
    registerAdapter(testAdapter);

    const tag = nextTag('rwc-cloak');
    defineComponent(tag, () => ({}));

    document.body.innerHTML = `<${tag}><div x-cloak></div></${tag}>`;
    const div = document.querySelector(`${tag} div`) as HTMLDivElement;

    await nextTick();
    expect(div.hasAttribute('x-cloak')).toBe(false);
  });
});
