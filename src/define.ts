import { collectStaticRefs, createContext, type BindingContext } from './context';
import type { ReactivityAdapter } from './adapters/types';
import { processDirectives } from './directives/registry';

export type SetupFn = (ctx: ReturnType<typeof createContext>) => Record<string, unknown>;

export interface DefineComponentOptions {
  adapter: ReactivityAdapter;
}

export function defineComponent(name: string, setup: SetupFn, options: DefineComponentOptions) {
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

    connectedCallback() {
      const componentCtx = createContext(this, this.cleanup, adapter);
      queueMicrotask(() => {
        if (!this.isConnected) return;
        collectStaticRefs(this, componentCtx.$refs);
        const scope = setup(componentCtx);
        this.ctx = { scope: { ...scope, $refs: componentCtx.$refs }, adapter, disposers: this.cleanup };
        processDirectives(this, this.ctx, { skipHydrated: true });
      });
    }

    disconnectedCallback() {
      if (!this.ctx) return;
      for (const dispose of this.ctx.disposers) {
        dispose();
      }
      this.ctx = null;
      this.cleanup.clear();
    }
  }

  customElements.define(name, RwcElement);
}
