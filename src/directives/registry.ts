import type { BindingContext } from '../context';
import { processText } from './text';

type DirectiveHandler = (el: Element, value: string, ctx: BindingContext, attrName: string) => void;

const handlers: Record<string, DirectiveHandler> = {
  'x-text': (el, value, ctx) => processText(el, value, ctx)
};

export function processDirectives(root: ParentNode, ctx: BindingContext) {
  const elements: Element[] = [];
  if (root instanceof Element) {
    elements.push(root, ...Array.from(root.querySelectorAll('*')));
  } else {
    elements.push(...Array.from(root.querySelectorAll('*')));
  }

  for (const el of elements) {
    for (const attr of Array.from(el.attributes)) {
      const handler = handlers[attr.name];
      if (handler) {
        handler(el, attr.value, ctx, attr.name);
      }
    }
  }
}
