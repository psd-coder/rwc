import {
  collectStaticRefs,
  createContext,
  setupProps,
  type BindingContext,
  type ComponentContext,
  type ComponentRefs
} from './context';
import type { ReactivityAdapter } from './adapters/types';
import { processDirectives } from './directives/registry';

export type SetupFn<
  P extends Record<string, unknown> = {},
  Refs extends ComponentRefs = Record<string, HTMLElement>,
  Adapter extends ReactivityAdapter = ReactivityAdapter,
> = (ctx: ComponentContext<P, Refs, Adapter>) => Record<string, unknown>;

export interface DefineComponentOptions<
  P extends Record<string, unknown> = {},
  Adapter extends ReactivityAdapter = ReactivityAdapter,
> {
  adapter: Adapter;
  props?: Array<keyof P & string>;
}

export function defineComponent<
  P extends Record<string, unknown> = {},
  Refs extends ComponentRefs = Record<string, HTMLElement>,
  Adapter extends ReactivityAdapter = ReactivityAdapter,
>(
  name: string,
  setup: SetupFn<P, Refs, NoInfer<Adapter>>,
  options: DefineComponentOptions<P, Adapter>
) {
  const adapter = options?.adapter;
  if (!adapter) {
    throw new Error('Adapter is required. Pass { adapter } as the third argument to defineComponent.');
  }

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
        let ancestor = this.parentElement;
        let hasComponentParent = false;
        while (ancestor) {
          if (ancestor.tagName.includes('-')) {
            hasComponentParent = true;
            break;
          }
          ancestor = ancestor.parentElement;
        }
        if (allowDefer && hasComponentParent && options.props?.length) {
          const element = this as Record<string, unknown>;
          const pendingProps = options.props.some(
            (prop) => element[prop] === undefined && this.hasAttribute(`x-prop:${prop}`)
          );
          if (pendingProps) {
            queueMicrotask(() => init(false));
            return;
          }
        }
        collectStaticRefs(this, componentCtx.$refs);
        if (options.props) {
          setupProps(this, componentCtx.props, options.props, adapter);
        }
        const scope = setup(componentCtx);
        this.ctx = { scope: { ...scope, $refs: componentCtx.$refs }, adapter, disposers: this.cleanup };
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
