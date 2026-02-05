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
import { clearHydrationMarks, isHydratedElement, isHydratedWithinRoot } from './hydration';

type DirectiveHandler = (el: Element, value: string, ctx: BindingContext, attrName: string) => void;
export type ProcessOptions = { skipHydrated?: boolean; skipRoot?: boolean; treatRootAsBoundary?: boolean };

const handlers: Record<string, DirectiveHandler> = {
  'x-text': (el, value, ctx) => processText(el, value, ctx),
  'x-html': (el, value, ctx) => processHtml(el, value, ctx),
  'x-if': (el, value, ctx) => processIf(el, value, ctx, processDirectives),
  'x-for': (el, value, ctx) => processFor(el, value, ctx, processDirectives),
  'x-show': (el, value, ctx) => processShow(el, value, ctx),
  'x-ref': (el, value, ctx) => processRef(el, value, ctx),
  'x-cloak': (el) => processCloak(el),
  'x-portal': (el, value, ctx) => processPortal(el, value, ctx, processDirectives),
  'x-style': (el, value, ctx, attrName) => processStyle(el, value, ctx, attrName)
};

const prefixHandlers: Array<{ prefix: string; handler: DirectiveHandler }> = [
  { prefix: 'x-attr:', handler: processAttr },
  { prefix: 'x-prop:', handler: processProp },
  { prefix: 'x-class:', handler: processClass },
  { prefix: 'x-style:', handler: processStyle },
  { prefix: 'x-on:', handler: processOn }
];

export function processDirectives(root: ParentNode, ctx: BindingContext, options: ProcessOptions = {}) {
  const { skipHydrated = false, skipRoot = false, treatRootAsBoundary = false } = options;
  const elements: Element[] = [];
  if (root instanceof Element) {
    if (!skipRoot) {
      elements.push(root);
    }
    elements.push(...Array.from(root.querySelectorAll('*')));
  } else {
    elements.push(...Array.from(root.querySelectorAll('*')));
  }

  const skipRoots: Element[] = [];

  for (const el of elements) {
    if (skipRoots.some((root) => root !== el && root.contains(el))) {
      continue;
    }
    if (skipHydrated && (root instanceof Element ? isHydratedWithinRoot(el, root) : isHydratedElement(el))) {
      skipRoots.push(el);
      continue;
    }

    const ifExpr = el.getAttribute('x-if');
    const forExpr = el.getAttribute('x-for');
    const portalTarget = el.getAttribute('x-portal');

    if (ifExpr && portalTarget) {
      if (!(el instanceof HTMLTemplateElement)) {
        el.removeAttribute('x-if');
        el.removeAttribute('x-portal');
        skipRoots.push(el);
      }
      processIf(el, ifExpr, ctx, processDirectives, portalTarget);
      continue;
    }

    if (ifExpr) {
      if (!(el instanceof HTMLTemplateElement)) {
        skipRoots.push(el);
      }
      processIf(el, ifExpr, ctx, processDirectives);
      continue;
    }

    if (forExpr) {
      if (!(el instanceof HTMLTemplateElement)) {
        skipRoots.push(el);
      }
      processFor(el, forExpr, ctx, processDirectives);
      continue;
    }

    if (portalTarget) {
      if (!(el instanceof HTMLTemplateElement)) {
        skipRoots.push(el);
      }
      processPortal(el, portalTarget, ctx, processDirectives);
      continue;
    }

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

    if (el.tagName.includes('-') && (!(root instanceof Element) || el !== root || treatRootAsBoundary)) {
      skipRoots.push(el);
    }
  }

  if (skipHydrated) {
    clearHydrationMarks(root);
  }
}
