import { describe, expect, it } from 'vitest';
import { parse } from './parser';
import { collectDependencies } from './deps';

describe('dependency collection', () => {
  const storeA = { __store: true, name: 'a' };
  const storeB = { __store: true, name: 'b' };
  const isStore = (value: unknown): value is { __store: boolean } =>
    !!value && typeof value === 'object' && '__store' in value;

  it('collects no dependencies from literals', () => {
    expect(collectDependencies(parse('true'), {}, isStore)).toEqual([]);
    expect(collectDependencies(parse('123'), {}, isStore)).toEqual([]);
  });

  it('collects store identifiers', () => {
    const scope = { count: storeA, plain: 1 };
    const deps = collectDependencies(parse('count + 1'), scope, isStore);
    expect(deps).toEqual([storeA]);
  });

  it('collects store identifiers from member access', () => {
    const scope = { user: storeA };
    const deps = collectDependencies(parse('user.name'), scope, isStore);
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

  it('collects dependencies inside unary and ternary expressions', () => {
    const scope = { active: storeA, yes: storeB, no: storeB };
    const unaryDeps = collectDependencies(parse('!active'), scope, isStore);
    expect(unaryDeps).toEqual([storeA]);

    const ternaryDeps = collectDependencies(parse('active ? yes : no'), scope, isStore);
    expect(ternaryDeps).toEqual([storeA, storeB]);
  });

  it('collects dependencies from call arguments', () => {
    const scope = { count: storeA, format: () => {} };
    const deps = collectDependencies(parse('format(count)'), scope, isStore);
    expect(deps).toEqual([storeA]);
  });

  it('ignores special variables not in scope', () => {
    const deps = collectDependencies(parse('$event'), {}, isStore);
    expect(deps).toEqual([]);
  });
});
