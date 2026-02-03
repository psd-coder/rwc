import type { BindingContext } from '../context';
import { createChildContext } from '../context';
import { bindExpression } from './utils';
import { setupTemplate } from './_utils';

type MountedBlock = {
  ctx: BindingContext;
  nodes: Node[];
};

type DirectiveProcessor = (root: ParentNode, ctx: BindingContext) => void;

export function processIf(
  el: Element,
  exprSource: string,
  ctx: BindingContext,
  processDirectives: DirectiveProcessor,
  portalTargetSelector?: string
) {
  let portalTarget: Element | null = null;

  if (portalTargetSelector) {
    portalTarget = document.querySelector(portalTargetSelector);
    if (!portalTarget) {
      throw new Error(`Portal target not found: ${portalTargetSelector}`);
    }
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
    processDirectives(fragment, childCtx);
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
    } else {
      unmount();
    }
  });
}
