import { describe, expect, it } from 'vitest';
import { parse } from './parser';

describe('expression parser', () => {
  it('parses literals and identifiers', () => {
    expect(parse('0')).toEqual({ type: 'literal', value: 0 });
    expect(parse('123')).toEqual({ type: 'literal', value: 123 });
    expect(parse('3.14')).toEqual({ type: 'literal', value: 3.14 });
    expect(parse('false')).toEqual({ type: 'literal', value: false });
    expect(parse('"hi"')).toEqual({ type: 'literal', value: 'hi' });
    expect(parse("''")).toEqual({ type: 'literal', value: '' });
    expect(parse('true')).toEqual({ type: 'literal', value: true });
    expect(parse('null')).toEqual({ type: 'literal', value: null });
    expect(parse('user')).toEqual({ type: 'ident', name: 'user' });
    expect(parse('$event')).toEqual({ type: 'ident', name: '$event' });
    expect(parse('_private')).toEqual({ type: 'ident', name: '_private' });
  });

  it('parses binary precedence', () => {
    expect(parse('1 + 2 * 3')).toEqual({
      type: 'binary',
      op: '+',
      left: { type: 'literal', value: 1 },
      right: {
        type: 'binary',
        op: '*',
        left: { type: 'literal', value: 2 },
        right: { type: 'literal', value: 3 }
      }
    });
  });

  it('parses unary and ternary', () => {
    expect(parse('!active')).toEqual({
      type: 'unary',
      op: '!',
      arg: { type: 'ident', name: 'active' }
    });
    expect(parse('+count')).toEqual({
      type: 'unary',
      op: '+',
      arg: { type: 'ident', name: 'count' }
    });

    expect(parse('flag ? a : b')).toEqual({
      type: 'ternary',
      test: { type: 'ident', name: 'flag' },
      consequent: { type: 'ident', name: 'a' },
      alternate: { type: 'ident', name: 'b' }
    });
  });

  it('parses member, index, and call chains', () => {
    expect(parse('user.name')).toEqual({
      type: 'member',
      object: { type: 'ident', name: 'user' },
      property: 'name'
    });
    expect(parse('user.address.city')).toEqual({
      type: 'member',
      object: {
        type: 'member',
        object: { type: 'ident', name: 'user' },
        property: 'address'
      },
      property: 'city'
    });

    expect(parse('items[0]')).toEqual({
      type: 'index',
      object: { type: 'ident', name: 'items' },
      index: { type: 'literal', value: 0 }
    });
    expect(parse('obj[key]')).toEqual({
      type: 'index',
      object: { type: 'ident', name: 'obj' },
      index: { type: 'ident', name: 'key' }
    });

    expect(parse('increment()')).toEqual({
      type: 'call',
      callee: { type: 'ident', name: 'increment' },
      args: []
    });
    expect(parse('obj.method(1, foo)')).toEqual({
      type: 'call',
      callee: {
        type: 'member',
        object: { type: 'ident', name: 'obj' },
        property: 'method'
      },
      args: [{ type: 'literal', value: 1 }, { type: 'ident', name: 'foo' }]
    });
  });

  it('parses array and object literals', () => {
    expect(parse('[1, 2, foo]')).toEqual({
      type: 'array',
      items: [
        { type: 'literal', value: 1 },
        { type: 'literal', value: 2 },
        { type: 'ident', name: 'foo' }
      ]
    });

    expect(parse('{ a: 1, \"b\": foo }')).toEqual({
      type: 'object',
      entries: [
        { key: 'a', value: { type: 'literal', value: 1 } },
        { key: 'b', value: { type: 'ident', name: 'foo' } }
      ]
    });
  });

  it('respects grouping', () => {
    expect(parse('(1 + 2) * 3')).toEqual({
      type: 'binary',
      op: '*',
      left: {
        type: 'binary',
        op: '+',
        left: { type: 'literal', value: 1 },
        right: { type: 'literal', value: 2 }
      },
      right: { type: 'literal', value: 3 }
    });
  });
});
