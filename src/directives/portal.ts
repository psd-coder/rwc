import type { BindingContext } from '../context';
import { createChildContext } from '../context';
import { setupTemplate } from './_utils';

type DirectiveProcessor = (root: ParentNode, ctx: BindingContext) => void;

export function processPortal(
  el: Element,
  selector: string,
  ctx: BindingContext,
  processDirectives: DirectiveProcessor
) {
  const target = document.querySelector(selector);
  if (!target) {
    throw new Error(`Portal target not found: ${selector}`);
  }

  const templateSetup = setupTemplate(el, 'x-portal');
  if (!templateSetup) return;
  const { template, placeholder } = templateSetup;

  const fragment = template.content.cloneNode(true) as DocumentFragment;
  const childCtx = createChildContext(ctx);
  processDirectives(fragment, childCtx);
  const nodes = Array.from(fragment.childNodes);
  target.append(...nodes);

  ctx.disposers.add(() => {
    for (const dispose of childCtx.disposers) {
      dispose();
    }
    nodes.forEach(node => node.parentNode?.removeChild(node));
    placeholder?.remove();
  });
}
