import { createContext, type BindingContext } from './context';
import { getAdapter } from './adapters/registry';
import { processDirectives } from './directives/registry';

export type SetupFn = (ctx: ReturnType<typeof createContext>) => Record<string, unknown>;

export function defineComponent(name: string, setup: SetupFn) {
  if (customElements.get(name)) {
    return;
  }

  class RwcElement extends HTMLElement {
    private ctx: BindingContext | null = null;
    private cleanup = new Set<() => void>();

    connectedCallback() {
      const componentCtx = createContext(this, this.cleanup);
      const scope = setup(componentCtx);
      this.ctx = { scope: { ...scope, $refs: componentCtx.$refs }, adapter: getAdapter(), disposers: this.cleanup };
      queueMicrotask(() => {
        if (!this.ctx) return;
        processDirectives(this, this.ctx);
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
