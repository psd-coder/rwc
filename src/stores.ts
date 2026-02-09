import type { ReactivityAdapter } from "./adapters/types";

export function isReactiveStore(value: unknown, adapter: ReactivityAdapter): boolean {
  return adapter.isStore(value);
}

export function readReactiveStoreValue(value: unknown, adapter: ReactivityAdapter): unknown {
  if (!adapter.isStore(value)) {
    throw new Error("Expected a reactive store");
  }
  return adapter.get(value);
}

export function subscribeReactiveStore(
  value: unknown,
  adapter: ReactivityAdapter,
  callback: (value: unknown) => void,
): () => void {
  if (!adapter.isStore(value)) {
    throw new Error("Expected a reactive store");
  }
  return adapter.subscribe(value, callback);
}
