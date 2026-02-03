import clsx, { type ClassValue } from 'clsx';
import type { BindingContext } from '../context';
import { bindExpression } from './utils';

const baseClassCache = new WeakMap<Element, string>();

export function processClass(el: Element, exprSource: string, ctx: BindingContext, attrName: string) {
  const name = attrName.startsWith('x-class:') ? attrName.slice('x-class:'.length) : '';

  if (!name) {
    const element = el as HTMLElement;
    let base = baseClassCache.get(el);
    if (base === undefined) {
      base = element.className;
      baseClassCache.set(el, base);
    }
    bindExpression(exprSource, ctx, (value) => {
      element.className = clsx(base, value as ClassValue);
    });
    return;
  }

  bindExpression(exprSource, ctx, (value) => {
    el.classList.toggle(name, !!value);
  });
}
