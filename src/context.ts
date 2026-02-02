import type { ReactivityAdapter } from './adapters/types';
import { getAdapter } from './adapters/registry';

export interface ComponentContext {
  host: HTMLElement;
  registerCleanup: (fn: () => void) => void;
  $refs: Record<string, HTMLElement>;
  getElement: <E extends HTMLElement>(selector: string) => E;
  getElements: <E extends HTMLElement>(selector: string) => E[];
  dispatch: <T>(name: string, detail?: T, options?: CustomEventInit<T>) => boolean;
  on: <K extends keyof HTMLElementEventMap>(
    target: EventTarget | EventTarget[],
    type: K,
    listener: (ev: HTMLElementEventMap[K]) => void,
    options?: boolean | AddEventListenerOptions
  ) => void;
  effect: {
    <T>(store: T, callback: (value: unknown) => void): void;
    <Stores extends unknown[]>(
      stores: [...Stores],
      callback: (values: { [K in keyof Stores]: unknown }) => void
    ): void;
  };
}

export interface BindingContext {
  scope: Record<string, unknown>;
  adapter: ReactivityAdapter;
  disposers: Set<() => void>;
}

export function createContext(host: HTMLElement, disposers: Set<() => void>): ComponentContext {
  const adapter = getAdapter();
  const refs: Record<string, HTMLElement> = {};

  const effect = ((storeOrStores: unknown | unknown[], callback: (value: unknown) => void) => {
    if (Array.isArray(storeOrStores)) {
      const stores = storeOrStores;
      const readValues = () => stores.map(store => adapter.get(store));
      callback(readValues());
      for (const store of stores) {
        const unsub = adapter.subscribe(store, () => callback(readValues()));
        disposers.add(unsub);
      }
      return;
    }
    const unsub = adapter.subscribe(storeOrStores, callback);
    disposers.add(unsub);
  }) as ComponentContext['effect'];

  return {
    host,
    registerCleanup: (fn) => disposers.add(fn),
    $refs: refs,
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
    effect
  };
}
