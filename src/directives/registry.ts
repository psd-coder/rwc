import type { BindingContext } from '../context';
import { processAttr } from './attr';
import { processClass } from './class';
import { processCloak } from './cloak';
import { processFor } from './for';
import { processHtml } from './html';
import { processIf } from './if';
import { processOn } from './on';
import { processPortal } from './portal';
import { processProp } from './prop';
import { processRef } from './ref';
import { processShow } from './show';
import { processStyle } from './style';
import { processText } from './text';

type DirectiveHandler = (el: Element, value: string, ctx: BindingContext, attrName: string) => void;

const handlers: Record<string, DirectiveHandler> = {
  'x-text': (el, value, ctx) => processText(el, value, ctx),
  'x-html': (el, value, ctx) => processHtml(el, value, ctx),
  'x-if': (el, value, ctx) => processIf(el, value, ctx, processDirectives),
  'x-for': (el, value, ctx) => processFor(el, value, ctx, processDirectives),
  'x-show': (el, value, ctx) => processShow(el, value, ctx),
  'x-ref': (el, value, ctx) => processRef(el, value, ctx),
  'x-cloak': (el) => processCloak(el),
  'x-portal': (el, value, ctx) => processPortal(el, value, ctx, processDirectives)
};

const prefixHandlers: Array<{ prefix: string; handler: DirectiveHandler }> = [
  { prefix: 'x-attr:', handler: processAttr },
  { prefix: 'x-prop:', handler: processProp },
  { prefix: 'x-class:', handler: processClass },
  { prefix: 'x-style:', handler: processStyle },
  { prefix: 'x-on:', handler: processOn }
];

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
        continue;
      }

      if (attr.name === 'x-class') {
        processClass(el, attr.value, ctx, attr.name);
        continue;
      }

      for (const { prefix, handler: prefixHandler } of prefixHandlers) {
        if (attr.name.startsWith(prefix)) {
          prefixHandler(el, attr.value, ctx, attr.name);
          break;
        }
      }
    }
  }
}
