import { describe, expect, it, vi } from 'vitest';
import { atom, type WritableAtom } from "nanostores";
import { nanostores } from './nanostores';

const createStore = <T,>(initial: T) => {
  return atom(initial) as WritableAtom<T>;
};

describe('nanostores adapter', () => {
  it('identifies compatible stores', () => {
    const store = createStore(0);
    expect(nanostores.isStore(store)).toBe(true);
    expect(nanostores.isStore(42)).toBe(false);
    expect(nanostores.isStore(null)).toBe(false);
    expect(nanostores.isStore({})).toBe(false);
  });

  it('reads store values', () => {
    const store = createStore(42);
    expect(nanostores.get(store)).toBe(42);
    store.set(7);
    expect(nanostores.get(store)).toBe(7);
  });

  it('subscribes and unsubscribes', () => {
    const store = createStore(1);
    const callback = vi.fn();

    const unsubscribe = nanostores.subscribe(store, callback);
    expect(callback).toHaveBeenCalledWith(1);

    callback.mockClear();
    store.set(2);
    expect(callback).toHaveBeenCalledWith(2);

    callback.mockClear();
    unsubscribe();
    store.set(3);
    expect(callback).not.toHaveBeenCalled();
  });

  it('supports multiple subscribers', () => {
    const store = createStore(0);
    const callback1 = vi.fn();
    const callback2 = vi.fn();

    nanostores.subscribe(store, callback1);
    nanostores.subscribe(store, callback2);
    callback1.mockClear();
    callback2.mockClear();

    store.set(5);
    expect(callback1).toHaveBeenCalledWith(5);
    expect(callback2).toHaveBeenCalledWith(5);
  });

  it("creates writable stores and sets values", () => {
    const store = nanostores.create(10);
    expect(nanostores.get(store)).toBe(10);

    nanostores.set(store, 25);
    expect(nanostores.get(store)).toBe(25);
  });
});
