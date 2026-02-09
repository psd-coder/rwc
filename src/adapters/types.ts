export interface StoreValueTemplate {
  readonly store: unknown;
  readonly value: unknown;
}

export interface StoreShapeTemplate {
  readonly value: unknown;
  readonly store: unknown;
}

export interface DefaultStoreValueTemplate extends StoreValueTemplate {
  readonly value: this['store'] extends { get: (...args: never[]) => infer TValue }
    ? TValue
    : this['store'] extends { value: infer TValue }
      ? TValue
      : this['store'] extends {
            subscribe: (
              listener: (value: infer TValue, ...args: unknown[]) => unknown,
              ...args: unknown[]
            ) => unknown;
          }
        ? TValue
        : unknown;
}

export type ResolveStoreValue<TTemplate extends StoreValueTemplate, TStore> =
  (TTemplate & { store: TStore })['value'];

export interface DefaultReadableStoreTemplate extends StoreShapeTemplate {
  readonly store: {
    get: () => unknown;
    subscribe: (listener: (value: unknown) => void) => () => void;
  };
}

export interface DefaultWritableStoreTemplate extends StoreShapeTemplate {
  readonly store: DefaultReadableStoreTemplate['store'] & {
    set: (value: unknown) => void;
  };
}

export type ResolveStoreShape<TTemplate extends StoreShapeTemplate, TValue> =
  (TTemplate & { value: TValue })['store'];

export interface ReactivityAdapter<
  TStore = unknown,
  TValueTemplate extends StoreValueTemplate = DefaultStoreValueTemplate,
  TReadableStoreTemplate extends StoreShapeTemplate = StoreShapeTemplate,
  TWritableStoreTemplate extends StoreShapeTemplate = StoreShapeTemplate,
> {
  isStore(value: unknown): value is TStore;
  get(store: TStore): ResolveStoreValue<TValueTemplate, TStore>;
  subscribe(store: TStore, callback: (value: ResolveStoreValue<TValueTemplate, TStore>) => void): () => void;
  create<TValue>(initial: TValue): ResolveStoreShape<TWritableStoreTemplate, TValue>;
  set<TValue>(store: ResolveStoreShape<TWritableStoreTemplate, TValue>, value: TValue): void;
}

export type AdapterStoreValue<TAdapter extends ReactivityAdapter, TStore> =
  TAdapter extends ReactivityAdapter<unknown, infer TValueTemplate, infer _R, infer _W>
    ? ResolveStoreValue<TValueTemplate, TStore>
    : unknown;

export type AdapterStore<TAdapter extends ReactivityAdapter> =
  TAdapter extends ReactivityAdapter<infer TStore, infer _V, infer _R, infer _W>
    ? TStore
    : never;

export type AdapterReadableStore<TAdapter extends ReactivityAdapter, TValue> =
  TAdapter extends ReactivityAdapter<infer _S, infer _V, infer TReadableStoreTemplate, infer _W>
    ? ResolveStoreShape<TReadableStoreTemplate, TValue>
    : never;

export type AdapterWritableStore<TAdapter extends ReactivityAdapter, TValue> =
  TAdapter extends ReactivityAdapter<infer _S, infer _V, infer _R, infer TWritableStoreTemplate>
    ? ResolveStoreShape<TWritableStoreTemplate, TValue>
    : never;
