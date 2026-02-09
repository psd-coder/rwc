import { atom, type ReadableAtom, type WritableAtom } from "nanostores";
import type { ReactivityAdapter, StoreShapeTemplate, StoreValueTemplate } from "./types";

interface NanoStoreValueTemplate extends StoreValueTemplate {
  readonly value: this["store"] extends ReadableAtom<infer TValue> ? TValue : unknown;
}

interface NanoReadableStoreTemplate extends StoreShapeTemplate {
  readonly store: ReadableAtom<this["value"]>;
}

interface NanoWritableStoreTemplate extends StoreShapeTemplate {
  readonly store: WritableAtom<this["value"]>;
}

export const nanostores: ReactivityAdapter<
  ReadableAtom<unknown>,
  NanoStoreValueTemplate,
  NanoReadableStoreTemplate,
  NanoWritableStoreTemplate
> = {
  isStore(value: unknown): value is ReadableAtom<unknown> {
    return !!value && typeof value === "object" && "subscribe" in value && "get" in value;
  },
  get<T>(store: ReadableAtom<T>) {
    return store.get();
  },
  subscribe<T>(store: ReadableAtom<T>, callback: (value: T) => void) {
    return store.subscribe((value) => callback(value));
  },
  create<TValue>(initial: TValue) {
    return atom(initial);
  },
  set<TValue>(store: WritableAtom<TValue>, value: TValue) {
    store.set(value);
  },
};
