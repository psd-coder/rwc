import { describe, expect, it } from 'vitest';
import { createBindingContext } from '../context';
import { createStore, setStore, testReactivity } from '../test-utils';
import { processDirectives } from './registry';

describe('processDirectives boundaries', () => {
  it('treatRootAsBoundary skips child directives on custom elements', () => {
    document.body.innerHTML = '';
    const label = createStore('Alpha');
    const el = document.createElement('rwc-boundary');
    el.setAttribute('x-attr:data-label', 'label');
    el.innerHTML = `<span class="child" x-text="label">Initial</span>`;
    document.body.appendChild(el);

    const ctx = createBindingContext({ label }, testReactivity);
    processDirectives(el, ctx, { treatRootAsBoundary: true });

    const span = el.querySelector('.child') as HTMLSpanElement;
    expect(el.getAttribute('data-label')).toBe('Alpha');
    expect(span.textContent).toBe('Initial');

    setStore(label, 'Beta');
    expect(span.textContent).toBe('Initial');

    for (const dispose of ctx.disposers) dispose();
  });

  it('processes child directives on custom elements by default', () => {
    document.body.innerHTML = '';
    const label = createStore('Alpha');
    const el = document.createElement('rwc-default');
    el.setAttribute('x-attr:data-label', 'label');
    el.innerHTML = `<span class="child" x-text="label">Initial</span>`;
    document.body.appendChild(el);

    const ctx = createBindingContext({ label }, testReactivity);
    processDirectives(el, ctx);

    const span = el.querySelector('.child') as HTMLSpanElement;
    expect(el.getAttribute('data-label')).toBe('Alpha');
    expect(span.textContent).toBe('Alpha');

    setStore(label, 'Beta');
    expect(span.textContent).toBe('Beta');

    for (const dispose of ctx.disposers) dispose();
  });
});
