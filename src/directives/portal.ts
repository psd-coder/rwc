import type { BindingContext } from '../context';
import { createChildContext } from '../context';

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

  const isTemplate = el instanceof HTMLTemplateElement;
  let template: HTMLTemplateElement;
  let placeholder: Comment | null = null;

  if (isTemplate) {
    template = el;
  } else {
    const parent = el.parentNode;
    if (!parent) return;
    placeholder = document.createComment('x-portal');
    parent.insertBefore(placeholder, el);
    el.removeAttribute('x-portal');
    template = document.createElement('template');
    template.content.append(el);
  }

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
