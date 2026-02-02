import { describe, expect, it } from 'vitest';
import { parse } from './parser';
import { collectDependencies } from './deps';

describe('dependency collection', () => {
  const storeA = { __store: true, name: 'a' };
  const storeB = { __store: true, name: 'b' };
  const isStore = (value: unknown): value is { __store: boolean } =>
    !!value && typeof value === 'object' && '__store' in value;

  it('collects store identifiers', () => {
    const scope = { count: storeA, plain: 1 };
    const deps = collectDependencies(parse('count + 1'), scope, isStore);
    expect(deps).toEqual([storeA]);
  });

  it('ignores non-store members', () => {
    const scope = { user: { name: 'Ada' } };
    const deps = collectDependencies(parse('user.name'), scope, isStore);
    expect(deps).toEqual([]);
  });

  it('dedupes repeated stores and walks nested expressions', () => {
    const scope = { count: storeA, items: storeB, index: 0 };
    const deps = collectDependencies(parse('items[index] + count + count'), scope, isStore);
    expect(deps).toEqual([storeB, storeA]);
  });

  it('collects dependencies inside arrays and objects', () => {
    const scope = { count: storeA, other: storeB };
    const deps = collectDependencies(parse('[count, { a: other }]'), scope, isStore);
    expect(deps).toEqual([storeA, storeB]);
  });
});
