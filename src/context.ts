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

export function createBindingContext(
  scope: Record<string, unknown>,
  adapter: ReactivityAdapter,
  disposers: Set<() => void> = new Set()
): BindingContext {
  return { scope, adapter, disposers };
}

export function createChildContext(
  parent: BindingContext,
  scopeOverrides: Record<string, unknown> = {}
): BindingContext {
  return createBindingContext({ ...parent.scope, ...scopeOverrides }, parent.adapter, new Set());
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

export function collectStaticRefs(host: HTMLElement, refs: Record<string, HTMLElement>) {
  const candidates = host.querySelectorAll('[x-ref]');
  for (const el of candidates) {
    if (el.closest('template, [x-if], [x-for], [x-portal]')) continue;
    const name = el.getAttribute('x-ref')?.trim();
    if (!name) continue;
    refs[name] = el as HTMLElement;
  }
}
