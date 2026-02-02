import { describe, expect, it } from 'vitest';
import { parse } from './parser';
import { evaluate } from './evaluator';

describe('expression evaluator', () => {
  it('evaluates binary operators with precedence', () => {
    const expr = parse('1 + 2 * 3');
    expect(evaluate(expr, {})).toBe(7);
  });

  it('evaluates member and index access', () => {
    const scope = { user: { name: 'Ada' }, items: ['a', 'b'] };
    expect(evaluate(parse('user.name'), scope)).toBe('Ada');
    expect(evaluate(parse('items[1]'), scope)).toBe('b');
  });

  it('evaluates ternary expressions', () => {
    const scope = { ready: false, yes: 'yes', no: 'no' };
    expect(evaluate(parse('ready ? yes : no'), scope)).toBe('no');
  });

  it('calls functions and preserves this for members', () => {
    const scope = {
      sum: (a: number, b: number) => a + b,
      counter: {
        value: 2,
        inc() {
          return this.value + 1;
        }
      }
    };

    expect(evaluate(parse('sum(1, 2)'), scope)).toBe(3);
    expect(evaluate(parse('counter.inc()'), scope)).toBe(3);
  });

  it('evaluates array and object literals', () => {
    const scope = { foo: 'bar' };
    expect(evaluate(parse('[1, foo]'), scope)).toEqual([1, 'bar']);
    expect(evaluate(parse('{ a: 1, b: foo }'), scope)).toEqual({ a: 1, b: 'bar' });
  });

  it('supports special variables and custom value resolution', () => {
    const store = { value: 5 };
    const resolve = (value: unknown) =>
      value && typeof value === 'object' && 'value' in value ? (value as { value: number }).value : value;

    const specials = { $event: { detail: 9 } };
    expect(evaluate(parse('$event.detail'), {}, specials)).toBe(9);
    expect(evaluate(parse('count + 1'), { count: store }, {}, resolve)).toBe(6);
  });
});
