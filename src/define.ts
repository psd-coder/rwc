import {
  collectStaticRefs,
  createContext,
  setupProps,
  type ComponentContext,
  type BindingContext,
  type ComponentRefs
} from './context';
import type { ReactivityAdapter } from './adapters/types';
import { createExpressionProps } from './expression/props';
import { processDirectives } from './directives/registry';

export type SetupFn<
  P extends Record<string, unknown> = {},
  Refs extends ComponentRefs = Record<string, HTMLElement>,
  Adapter extends ReactivityAdapter = ReactivityAdapter,
> = (ctx: ComponentContext<P, Refs, Adapter>) => Record<string, unknown>;

export interface RuntimeDefineComponentOptions<P extends Record<string, unknown> = {}> {
  props?: Array<keyof P & string>;
}

export interface CreateRwcOptions<Adapter extends ReactivityAdapter = ReactivityAdapter> {
  adapter: Adapter;
}

export type RuntimeDefineComponent<Adapter extends ReactivityAdapter> = <
  P extends Record<string, unknown> = {},
  Refs extends ComponentRefs = Record<string, HTMLElement>,
>(
  name: string,
  setup: SetupFn<P, Refs, Adapter>,
  options?: RuntimeDefineComponentOptions<P>,
) => void;

function registerComponent<
  P extends Record<string, unknown> = {},
  Refs extends ComponentRefs = Record<string, HTMLElement>,
  Adapter extends ReactivityAdapter = ReactivityAdapter,
>(
  adapter: Adapter,
  name: string,
  setup: SetupFn<P, Refs, Adapter>,
  options: RuntimeDefineComponentOptions<P> = {},
) {
  if (customElements.get(name)) {
    return;
  }

  class RwcElement extends HTMLElement {
    private ctx: BindingContext | null = null;
    private cleanup = new Set<() => void>();
    private initializing = false;

    connectedCallback() {
      if (this.ctx || this.initializing) return;
      this.initializing = true;
      const componentCtx = createContext<P, Refs, Adapter>(this, this.cleanup, adapter);
      const init = (allowDefer: boolean) => {
        if (!this.isConnected) return;
        const propNames = resolvePropNames(this, options.props);
        let ancestor = this.parentElement;
        let hasComponentParent = false;
        while (ancestor) {
          if (ancestor.tagName.includes('-')) {
            hasComponentParent = true;
            break;
          }
          ancestor = ancestor.parentElement;
        }
        if (allowDefer && hasComponentParent && propNames.length) {
          const element = this as Record<string, unknown>;
          const pendingProps = propNames.some(
            (prop) => element[prop] === undefined && this.hasAttribute(`x-prop:${prop}`)
          );
          if (pendingProps) {
            queueMicrotask(() => init(false));
            return;
          }
        }
        collectStaticRefs(this, componentCtx.refs);
        if (propNames.length > 0) {
          setupProps(this, componentCtx.props, propNames as Array<keyof P & string>, adapter, this.cleanup);
        }
        const scope = setup(componentCtx);
        this.ctx = {
          scope: {
            ...scope,
            $props: createExpressionProps(componentCtx.props as Record<string, unknown>, adapter),
            $refs: componentCtx.refs,
          },
          adapter,
          disposers: this.cleanup,
        };
        processDirectives(this, this.ctx, { skipHydrated: true, skipRoot: hasComponentParent });
        this.initializing = false;
      };
      queueMicrotask(() => init(true));
    }

    disconnectedCallback() {
      if (!this.ctx) return;
      for (const dispose of this.ctx.disposers) {
        dispose();
      }
      this.ctx = null;
      this.cleanup.clear();
      this.initializing = false;
    }
  }

  customElements.define(name, RwcElement);
}

function createRuntimeDefineComponent<Adapter extends ReactivityAdapter>(
  adapter: Adapter,
): RuntimeDefineComponent<Adapter> {
  return <
    P extends Record<string, unknown> = {},
    Refs extends ComponentRefs = Record<string, HTMLElement>,
  >(
    name: string,
    setup: SetupFn<P, Refs, Adapter>,
    options: RuntimeDefineComponentOptions<P> = {},
  ) => {
    registerComponent(adapter, name, setup, options);
  };
}

export function createRwc<Adapter extends ReactivityAdapter>(
  options: CreateRwcOptions<Adapter>,
): { defineComponent: RuntimeDefineComponent<Adapter> } {
  const adapter = options?.adapter;
  if (!adapter) {
    throw new Error("Adapter is required. Pass { adapter } to createRwc.");
  }

  return {
    defineComponent: createRuntimeDefineComponent(adapter),
  };
}

function resolvePropNames(host: HTMLElement, declaredProps?: readonly string[]): string[] {
  const names = new Set<string>(declaredProps ?? []);
  for (const attr of host.getAttributeNames()) {
    if (!attr.startsWith("x-prop:")) continue;
    const prop = attr.slice("x-prop:".length).trim();
    if (!prop) continue;
    names.add(prop);
  }
  return [...names];
}
