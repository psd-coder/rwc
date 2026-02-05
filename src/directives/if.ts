import type { BindingContext } from '../context';
import { createChildContext } from '../context';
import { bindExpression } from './utils';
import { setupTemplate } from './_utils';
import type { ProcessOptions } from './registry';

const SSR_ATTR = 'x-if-ssr';

type MountedBlock = {
  ctx: BindingContext;
  nodes: Node[];
};

type DirectiveProcessor = (root: ParentNode, ctx: BindingContext, options?: ProcessOptions) => void;

export function processIf(
  el: Element,
  exprSource: string,
  ctx: BindingContext,
  processDirectives: DirectiveProcessor,
  portalTargetSelector?: string
) {
  const clearSsrMarkers = (nodes: Node[]) => {
    for (const node of nodes) {
      if (node instanceof Element && node.hasAttribute(SSR_ATTR)) {
        node.removeAttribute(SSR_ATTR);
      }
    }
  };
  let portalTarget: Element | null = null;

  if (portalTargetSelector) {
    portalTarget = document.querySelector(portalTargetSelector);
    if (!portalTarget) {
      throw new Error(`Portal target not found: ${portalTargetSelector}`);
    }
  }

  if (!(el instanceof HTMLTemplateElement) && !portalTarget) {
    const parent = el.parentNode;
    if (!parent) return;
    el.removeAttribute('x-if');
    const placeholder = document.createComment('x-if');
    parent.insertBefore(placeholder, el.nextSibling);
    const template = document.createElement('template');
    template.content.append(el.cloneNode(true));

    let mounted: MountedBlock | null = null;

    const mountExisting = () => {
      if (mounted) return;
      const childCtx = createChildContext(ctx);
      processDirectives(el, childCtx, { skipHydrated: true });
      mounted = { ctx: childCtx, nodes: [el] };
    };

    const mount = () => {
      if (mounted) return;
      const fragment = template.content.cloneNode(true) as DocumentFragment;
      const childCtx = createChildContext(ctx);
      processDirectives(fragment, childCtx, { skipHydrated: true });
      const nodes = Array.from(fragment.childNodes);
      placeholder.before(...nodes);
      mounted = { ctx: childCtx, nodes };
    };

    const unmount = () => {
      if (!mounted) return;
      for (const dispose of mounted.ctx.disposers) {
        dispose();
      }
      mounted.nodes.forEach(node => node.parentNode?.removeChild(node));
      mounted = null;
    };

    ctx.disposers.add(() => unmount());

    mountExisting();
    bindExpression(exprSource, ctx, (value) => {
      if (value) {
        mount();
        if (mounted) {
          clearSsrMarkers(mounted.nodes);
        }
      } else {
        unmount();
      }
    });

    return;
  }

  const templateSetup = setupTemplate(el, 'x-if');
  if (!templateSetup) return;
  const { template } = templateSetup;
  const anchor: ChildNode = templateSetup.isTemplate ? template : templateSetup.placeholder;

  let mounted: MountedBlock | null = null;

  const mount = () => {
    if (mounted) return;
    const fragment = template.content.cloneNode(true) as DocumentFragment;
    const childCtx = createChildContext(ctx);
    processDirectives(fragment, childCtx, { skipHydrated: true });
    const nodes = Array.from(fragment.childNodes);
    if (portalTarget) {
      portalTarget.append(...nodes);
    } else if (anchor instanceof HTMLTemplateElement) {
      anchor.after(...nodes);
    } else {
      anchor.before(...nodes);
    }
    mounted = { ctx: childCtx, nodes };
  };

  const unmount = () => {
    if (!mounted) return;
    for (const dispose of mounted.ctx.disposers) {
      dispose();
    }
    mounted.nodes.forEach(node => node.parentNode?.removeChild(node));
    mounted = null;
  };

  ctx.disposers.add(() => unmount());

  bindExpression(exprSource, ctx, (value) => {
    if (value) {
      mount();
      if (mounted) {
        clearSsrMarkers(mounted.nodes);
      }
    } else {
      unmount();
    }
  });
}
