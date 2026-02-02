import type { BindingContext } from '../context';
import { createChildContext } from '../context';
import { bindExpression } from './utils';

type MountedBlock = {
  ctx: BindingContext;
  nodes: Node[];
};

type DirectiveProcessor = (root: ParentNode, ctx: BindingContext) => void;

export function processIf(
  el: Element,
  exprSource: string,
  ctx: BindingContext,
  processDirectives: DirectiveProcessor
) {
  if (!(el instanceof HTMLTemplateElement)) {
    throw new Error('x-if must be used on a <template>');
  }

  const template = el;
  let mounted: MountedBlock | null = null;

  const mount = () => {
    if (mounted) return;
    const fragment = template.content.cloneNode(true) as DocumentFragment;
    const childCtx = createChildContext(ctx);
    processDirectives(fragment, childCtx);
    const nodes = Array.from(fragment.childNodes);
    template.after(...nodes);
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
