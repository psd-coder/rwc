export interface StoreValueTemplate {
  readonly store: unknown;
  readonly value: unknown;
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

export interface ReactivityAdapter<
  TStore = unknown,
  TValueTemplate extends StoreValueTemplate = DefaultStoreValueTemplate,
> {
  isStore(value: unknown): value is TStore;
  get(store: TStore): ResolveStoreValue<TValueTemplate, TStore>;
  subscribe(store: TStore, callback: (value: ResolveStoreValue<TValueTemplate, TStore>) => void): () => void;
}

export type AdapterStoreValue<TAdapter extends ReactivityAdapter, TStore> =
  TAdapter extends ReactivityAdapter<unknown, infer TValueTemplate>
    ? ResolveStoreValue<TValueTemplate, TStore>
    : unknown;
