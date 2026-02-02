export interface ReactivityAdapter<T = unknown> {
  isStore(value: unknown): value is T;
  get(store: T): unknown;
  subscribe(store: T, callback: (value: unknown) => void): () => void;
}
