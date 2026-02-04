import { describe, expect, it } from 'vitest';
import { tokenize } from './tokenizer';

describe('expression tokenizer', () => {
  it('throws on unterminated strings', () => {
    expect(() => tokenize('"unterminated')).toThrow(/Unterminated string/);
    expect(() => tokenize("'also unterminated")).toThrow(/Unterminated string/);
  });

  it('returns eof for empty input', () => {
    expect(tokenize('')).toEqual([{ type: 'eof', pos: 0 }]);
  });

  it('tokenizes integers and floats', () => {
    expect(tokenize('0')[0]).toEqual({ type: 'number', value: 0, pos: 0 });
    expect(tokenize('42')[0]).toEqual({ type: 'number', value: 42, pos: 0 });
    expect(tokenize('3.14')[0]).toEqual({ type: 'number', value: 3.14, pos: 0 });
  });

  it('does not consume dot when not followed by digit', () => {
    // "1.foo" → number 1, op '.', ident 'foo'
    const tokens = tokenize('1.foo');
    expect(tokens[0]).toEqual({ type: 'number', value: 1, pos: 0 });
    expect(tokens[1]).toEqual({ type: 'op', value: '.', pos: 1 });
    expect(tokens[2]).toEqual({ type: 'ident', value: 'foo', pos: 2 });
  });

  it('tokenizes identifiers with $, _ prefixes and digits', () => {
    expect(tokenize('foo')[0]).toEqual({ type: 'ident', value: 'foo', pos: 0 });
    expect(tokenize('$event')[0]).toEqual({ type: 'ident', value: '$event', pos: 0 });
    expect(tokenize('_x')[0]).toEqual({ type: 'ident', value: '_x', pos: 0 });
    expect(tokenize('a1b2')[0]).toEqual({ type: 'ident', value: 'a1b2', pos: 0 });
  });

  it('tokenizes multi-char operators', () => {
    expect(tokenize('===')[0]).toEqual({ type: 'op', value: '===', pos: 0 });
    expect(tokenize('!==')[0]).toEqual({ type: 'op', value: '!==', pos: 0 });
    expect(tokenize('&&')[0]).toEqual({ type: 'op', value: '&&', pos: 0 });
    expect(tokenize('||')[0]).toEqual({ type: 'op', value: '||', pos: 0 });
    expect(tokenize('<=')[0]).toEqual({ type: 'op', value: '<=', pos: 0 });
    expect(tokenize('>=')[0]).toEqual({ type: 'op', value: '>=', pos: 0 });
  });

  it('tokenizes single-char operators and delimiters', () => {
    for (const ch of ['+', '-', '*', '/', '!', '<', '>', '?', ':', '.', ',', '(', ')', '[', ']', '{', '}']) {
      expect(tokenize(ch)[0]).toEqual({ type: 'op', value: ch, pos: 0 });
    }
  });

  it('tokenizes strings in both quote styles', () => {
    expect(tokenize('"hello"')[0]).toEqual({ type: 'string', value: 'hello', pos: 0 });
    expect(tokenize("'world'")[0]).toEqual({ type: 'string', value: 'world', pos: 0 });
    expect(tokenize('""')[0]).toEqual({ type: 'string', value: '', pos: 0 });
  });

  it('handles string escape sequences', () => {
    expect(tokenize('"a\\nb"')[0].value).toBe('a\nb');
    expect(tokenize('"a\\rb"')[0].value).toBe('a\rb');
    expect(tokenize('"a\\tb"')[0].value).toBe('a\tb');
    expect(tokenize('"a\\\\"')[0].value).toBe('a\\');
    expect(tokenize('"say \\"hi\\""')[0].value).toBe('say "hi"');
    expect(tokenize("'it\\'s'")[0].value).toBe("it's");
  });

  it('passes through unknown escape sequences as-is', () => {
    // \z is not a recognized escape → just 'z'
    expect(tokenize('"\\z"')[0].value).toBe('z');
  });

  it('throws on backslash at end of string', () => {
    expect(() => tokenize('"abc\\')).toThrow(/Unterminated string/);
  });

  it('skips whitespace and tracks positions', () => {
    const tokens = tokenize('  a + b  ');
    expect(tokens[0]).toEqual({ type: 'ident', value: 'a', pos: 2 });
    expect(tokens[1]).toEqual({ type: 'op', value: '+', pos: 4 });
    expect(tokens[2]).toEqual({ type: 'ident', value: 'b', pos: 6 });
    expect(tokens[3]).toEqual({ type: 'eof', pos: 9 });
  });

  it('throws on unexpected characters', () => {
    expect(() => tokenize('@')).toThrow(/Unexpected character "@" at 0/);
    expect(() => tokenize('a #')).toThrow(/Unexpected character "#" at 2/);
  });
});
