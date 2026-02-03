import { describe, expect, it } from 'vitest';
import { tokenize } from './tokenizer';

describe('expression tokenizer', () => {
  it('throws on unterminated strings', () => {
    expect(() => tokenize('"unterminated')).toThrow(/Unterminated string/);
    expect(() => tokenize("'also unterminated")).toThrow(/Unterminated string/);
  });
});
