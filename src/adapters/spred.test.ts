import { describe, expect, it, vi } from 'vitest';
import { spred } from './spred';

const createSignal = <T,>(initial: T) => {
  const subs = new Set<(next: T) => void>();
  const signal = {
    value: initial,
    subscribe: (callback: (next: T) => void) => {
      subs.add(callback);
      callback(signal.value);
      return () => subs.delete(callback);
    },
    set: (next: T) => {
      signal.value = next;
      for (const sub of subs) sub(signal.value);
    }
  };
  return signal;
};

describe('spred adapter', () => {
  it('identifies compatible signals', () => {
    const signal = createSignal(0);
    expect(spred.isStore(signal)).toBe(true);
    expect(spred.isStore(42)).toBe(false);
    expect(spred.isStore(null)).toBe(false);
    expect(spred.isStore({})).toBe(false);
  });

  it('reads signal values', () => {
    const signal = createSignal(5);
    expect(spred.get(signal)).toBe(5);
    signal.set(8);
    expect(spred.get(signal)).toBe(8);
  });

  it('subscribes and unsubscribes', () => {
    const signal = createSignal(1);
    const callback = vi.fn();

    const unsubscribe = spred.subscribe(signal, callback);
    expect(callback).toHaveBeenCalledWith(1);

    callback.mockClear();
    signal.set(2);
    expect(callback).toHaveBeenCalledWith(2);

    callback.mockClear();
    unsubscribe();
    signal.set(3);
    expect(callback).not.toHaveBeenCalled();
  });

  it('supports multiple subscribers', () => {
    const signal = createSignal(0);
    const callback1 = vi.fn();
    const callback2 = vi.fn();

    spred.subscribe(signal, callback1);
    spred.subscribe(signal, callback2);
    callback1.mockClear();
    callback2.mockClear();

    signal.set(4);
    expect(callback1).toHaveBeenCalledWith(4);
    expect(callback2).toHaveBeenCalledWith(4);
  });

  it("creates writable signals and sets values", () => {
    const signal = spred.create(2);
    expect(spred.get(signal)).toBe(2);

    spred.set(signal, 6);
    expect(spred.get(signal)).toBe(6);
  });
});
