import { describe, expect, it } from 'vitest';
import { defineComponent } from '../test-define';
import { createStore, nextTag, nextTick, setStore, testReactivity } from '../test-utils';

describe('x-style directive', () => {
  it('sets styles from literal expressions', async () => {
    const tag = nextTag('rwc-style-literal');
    defineComponent(tag, () => ({}));

    document.body.innerHTML = `<${tag}><div x-style:color="'blue'"></div></${tag}>`;
    const div = document.querySelector(`${tag} div`) as HTMLDivElement;

    await nextTick();
    expect(div.style.color).toBe('blue');
  });

  it('sets and removes inline styles', async () => {
    const color = createStore<unknown>('red');
    const tag = nextTag('rwc-style');
    defineComponent(tag, () => ({ color }));

    document.body.innerHTML = `<${tag}><div x-style:color="color"></div></${tag}>`;
    const div = document.querySelector(`${tag} div`) as HTMLDivElement;

    await nextTick();
    expect(div.style.color).toBe('red');

    setStore(color, null);
    expect(div.style.color).toBe('');
  });

  it('supports expression values', async () => {
    const count = createStore(5);
    const tag = nextTag('rwc-style-expr');
    defineComponent(tag, () => ({ count }));

    document.body.innerHTML = `<${tag}><div x-style:opacity="count / 10"></div></${tag}>`;
    const div = document.querySelector(`${tag} div`) as HTMLDivElement;

    await nextTick();
    expect(div.style.opacity).toBe('0.5');

    setStore(count, 8);
    expect(div.style.opacity).toBe('0.8');
  });

  it('supports kebab-case properties', async () => {
    const tag = nextTag('rwc-style-kebab');
    defineComponent(tag, () => ({}));

    document.body.innerHTML = `<${tag}><div x-style:background-color="'yellow'"></div></${tag}>`;
    const div = document.querySelector(`${tag} div`) as HTMLDivElement;

    await nextTick();
    expect(div.style.backgroundColor).toBe('yellow');
  });

  it('removes style when value is false', async () => {
    const color = createStore<unknown>('blue');
    const tag = nextTag('rwc-style-false');
    defineComponent(tag, () => ({ color }));

    document.body.innerHTML = `<${tag}><div x-style:color="color"></div></${tag}>`;
    const div = document.querySelector(`${tag} div`) as HTMLDivElement;

    await nextTick();
    expect(div.style.color).toBe('blue');

    setStore(color, false);
    expect(div.style.color).toBe('');
  });

  it('stringifies true for custom properties', async () => {
    const flag = createStore<unknown>(true);
    const tag = nextTag('rwc-style-true');
    defineComponent(tag, () => ({ flag }));

    document.body.innerHTML = `<${tag}><div x-style:--flag="flag"></div></${tag}>`;
    const div = document.querySelector(`${tag} div`) as HTMLDivElement;

    await nextTick();
    expect(div.style.getPropertyValue('--flag')).toBe('true');
  });

  it('supports object literals on x-style', async () => {
    const tag = nextTag('rwc-style-object-literal');
    defineComponent(tag, () => ({}));

    document.body.innerHTML = `
      <${tag}>
        <div x-style="{ display: 'none', backgroundColor: 'red', '--accent': 'blue' }"></div>
      </${tag}>
    `;
    const div = document.querySelector(`${tag} div`) as HTMLDivElement;

    await nextTick();
    expect(div.style.display).toBe('none');
    expect(div.style.backgroundColor).toBe('red');
    expect(div.style.getPropertyValue('--accent')).toBe('blue');
  });

  it('updates object styles reactively and removes missing keys', async () => {
    const styles = createStore<Record<string, unknown> | null>({
      color: 'red',
      backgroundColor: 'yellow'
    });
    const tag = nextTag('rwc-style-object-store');
    defineComponent(tag, () => ({ styles }));

    document.body.innerHTML = `<${tag}><div x-style="styles"></div></${tag}>`;
    const div = document.querySelector(`${tag} div`) as HTMLDivElement;

    await nextTick();
    expect(div.style.color).toBe('red');
    expect(div.style.backgroundColor).toBe('yellow');

    setStore(styles, { color: 'green', opacity: 0.5 });
    expect(div.style.color).toBe('green');
    expect(div.style.backgroundColor).toBe('');
    expect(div.style.opacity).toBe('0.5');

    setStore(styles, null);
    expect(div.style.color).toBe('');
    expect(div.style.opacity).toBe('');
  });
});
