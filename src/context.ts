import type {
  AdapterReadableStore,
  AdapterStoreValue,
  AdapterWritableStore,
  ReactivityAdapter,
} from "./adapters/types";
import { isReactiveStore, readReactiveStoreValue, subscribeReactiveStore } from "./stores";

export type ComponentRefs = Record<string, HTMLElement | undefined>;

type IsAdapterCompatibleStore<TProp, TAdapter extends ReactivityAdapter> = [TProp] extends [
  AdapterReadableStore<TAdapter, AdapterStoreValue<TAdapter, TProp>>,
]
  ? true
  : false;

type PropStore<TProp, TAdapter extends ReactivityAdapter> =
  IsAdapterCompatibleStore<TProp, TAdapter> extends true
    ? TProp
    : AdapterReadableStore<TAdapter, TProp>;

export type ComponentProps<
  P extends Record<string, unknown>,
  TAdapter extends ReactivityAdapter = ReactivityAdapter,
> = {
  [K in keyof P]: PropStore<P[K], TAdapter>;
};

type EffectStoreValue<TAdapter extends ReactivityAdapter, TStore> = AdapterStoreValue<TAdapter, TStore>;

export interface ComponentContext<
  P extends Record<string, unknown> = {},
  Refs extends ComponentRefs = Record<string, HTMLElement>,
  Adapter extends ReactivityAdapter = ReactivityAdapter,
> {
  props: ComponentProps<P, Adapter>;
  host: HTMLElement;
  registerCleanup: (fn: () => void) => void;
  refs: Refs;
  getElement: <E extends HTMLElement>(selector: string) => E;
  getElements: <E extends HTMLElement>(selector: string) => E[];
  dispatch: <T>(name: string, detail?: T, options?: CustomEventInit<T>) => boolean;
  on: <K extends keyof HTMLElementEventMap>(
    target: EventTarget | EventTarget[],
    type: K,
    listener: (ev: HTMLElementEventMap[K]) => void,
    options?: boolean | AddEventListenerOptions,
  ) => void;
  effect: {
    <Stores extends unknown[]>(
      stores: readonly [...Stores],
      callback: (values: { [K in keyof Stores]: EffectStoreValue<Adapter, Stores[K]> }) => void,
    ): void;
    <Store>(store: Store, callback: (value: EffectStoreValue<Adapter, Store>) => void): void;
  };
}

export interface BindingContext {
  scope: Record<string, unknown>;
  adapter: ReactivityAdapter;
  disposers: Set<() => void>;
}

export function createBindingContext(
  scope: Record<string, unknown>,
  adapter: ReactivityAdapter,
  disposers: Set<() => void> = new Set(),
): BindingContext {
  return { scope, adapter, disposers };
}

export function createChildContext(
  parent: BindingContext,
  scopeOverrides: Record<string, unknown> = {},
): BindingContext {
  return createBindingContext({ ...parent.scope, ...scopeOverrides }, parent.adapter, new Set());
}

export function createContext<
  P extends Record<string, unknown> = {},
  Refs extends ComponentRefs = Record<string, HTMLElement>,
  Adapter extends ReactivityAdapter = ReactivityAdapter,
>(
  host: HTMLElement,
  disposers: Set<() => void>,
  adapter: Adapter,
): ComponentContext<P, Refs, Adapter> {
  const refs: ComponentRefs = {};
  const propValues: Record<string, unknown> = {};
  const props = new Proxy(propValues, {
    get(target, key, receiver) {
      if (typeof key === "string" && !Object.prototype.hasOwnProperty.call(target, key)) {
        initializePropStore(host as unknown as Record<string, unknown>, target, key, adapter, disposers);
      }
      return Reflect.get(target, key, receiver);
    },
  }) as ComponentProps<P, Adapter>;
  const baseAdapter = adapter as ReactivityAdapter;

  const effect = ((storeOrStores: unknown | readonly unknown[], callback: (value: unknown) => void) => {
    if (Array.isArray(storeOrStores)) {
      const stores = storeOrStores;
      const readValues = () => stores.map((store) => readReactiveStoreValue(store, baseAdapter));
      callback(readValues());
      for (const store of stores) {
        const unsub = subscribeReactiveStore(store, baseAdapter, () => callback(readValues()));
        disposers.add(unsub);
      }
      return;
    }
    const unsub = subscribeReactiveStore(storeOrStores, baseAdapter, callback);
    disposers.add(unsub);
  }) as ComponentContext<P, Refs, Adapter>["effect"];

  return {
    props,
    host,
    registerCleanup: (fn) => disposers.add(fn),
    refs: refs as Refs,
    getElement: <E extends HTMLElement>(selector: string) => {
      const el = host.querySelector(selector);
      if (!el) throw new Error(`Element not found: ${selector}`);
      return el as E;
    },
    getElements: <E extends HTMLElement>(selector: string) =>
      Array.from(host.querySelectorAll(selector)) as E[],
    dispatch: (name, detail, options) =>
      host.dispatchEvent(new CustomEvent(name, { bubbles: true, cancelable: true, detail, ...options })),
    on: (target, type, listener, options) => {
      const targets = Array.isArray(target) ? target : [target];
      for (const t of targets) {
        t.addEventListener(type, listener as EventListener, options);
        disposers.add(() => t.removeEventListener(type, listener as EventListener, options));
      }
    },
    effect,
  };
}

export function setupProps<
  P extends Record<string, unknown>,
  Adapter extends ReactivityAdapter = ReactivityAdapter,
>(
  host: HTMLElement,
  props: ComponentProps<P, Adapter>,
  propNames: Array<keyof P & string>,
  adapter: Adapter,
  disposers?: Set<() => void>,
) {
  const propValues = props as Record<string, unknown>;
  const element = host as unknown as Record<string, unknown>;

  for (const name of propNames) {
    initializePropStore(element, propValues, name, adapter, disposers);
  }
}

function initializePropStore<Adapter extends ReactivityAdapter>(
  element: Record<string, unknown>,
  propValues: Record<string, unknown>,
  name: string,
  adapter: Adapter,
  disposers?: Set<() => void>,
) {
  if (Object.prototype.hasOwnProperty.call(propValues, name)) {
    return;
  }

  const ownDescriptor = Object.getOwnPropertyDescriptor(element, name);
  const baseAdapter = adapter as ReactivityAdapter;
  const initialValue = element[name];
  let sourceIsStore = isReactiveStore(initialValue, baseAdapter);
  let currentStore: unknown;
  let ownedStore: AdapterWritableStore<Adapter, unknown> | null = null;
  let sourceStoreUnsubscribe: (() => void) | null = null;

  const detachSourceStore = () => {
    sourceStoreUnsubscribe?.();
    sourceStoreUnsubscribe = null;
  };

  const attachSourceStore = (store: unknown) => {
    if (!ownedStore) return;
    detachSourceStore();
    adapter.set(ownedStore, readReactiveStoreValue(store, baseAdapter));
    sourceStoreUnsubscribe = subscribeReactiveStore(store, baseAdapter, (value) => {
      adapter.set(ownedStore as AdapterWritableStore<Adapter, unknown>, value);
    });
  };

  if (sourceIsStore) {
    currentStore = initialValue;
  } else {
    ownedStore = adapter.create(initialValue) as AdapterWritableStore<Adapter, unknown>;
    currentStore = ownedStore;
  }
  propValues[name] = currentStore;

  if (disposers) {
    disposers.add(() => detachSourceStore());
  }

  if (ownDescriptor && !ownDescriptor.configurable) {
    return;
  }

  Object.defineProperty(element, name, {
    get() {
      if (sourceIsStore) {
        return currentStore;
      }
      return readReactiveStoreValue(currentStore, baseAdapter);
    },
    set(next: unknown) {
      if (isReactiveStore(next, baseAdapter)) {
        if (ownedStore) {
          sourceIsStore = true;
          currentStore = next;
          attachSourceStore(next);
          propValues[name] = ownedStore;
          return;
        }

        sourceIsStore = true;
        currentStore = next;
        propValues[name] = next;
        return;
      }

      sourceIsStore = false;
      detachSourceStore();
      if (ownedStore) {
        adapter.set(ownedStore, next);
        currentStore = ownedStore;
        propValues[name] = ownedStore;
        return;
      }

      ownedStore = adapter.create(next) as AdapterWritableStore<Adapter, unknown>;
      currentStore = ownedStore;
      propValues[name] = ownedStore;
    },
    configurable: true,
    enumerable: ownDescriptor?.enumerable ?? true,
  });
}

export function collectStaticRefs(host: HTMLElement, refs: ComponentRefs) {
  const candidates = host.querySelectorAll("[x-ref]");
  for (const el of candidates) {
    if (el.closest("template, [x-if], [x-for], [x-portal]")) continue;
    let ancestor = el.parentElement;
    let hasCustomElementAncestor = false;
    while (ancestor && ancestor !== host) {
      if (ancestor.tagName.includes("-")) {
        hasCustomElementAncestor = true;
        break;
      }
      ancestor = ancestor.parentElement;
    }
    if (hasCustomElementAncestor) continue;
    const name = el.getAttribute("x-ref")?.trim();
    if (!name) continue;
    refs[name] = el as HTMLElement;
  }
}
