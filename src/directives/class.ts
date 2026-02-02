import clsx, { type ClassValue } from 'clsx';
import type { BindingContext } from '../context';
import { bindExpression } from './utils';

export function processClass(el: Element, exprSource: string, ctx: BindingContext, attrName: string) {
  const name = attrName.startsWith('x-class:') ? attrName.slice('x-class:'.length) : '';

  if (!name) {
    const base = (el as HTMLElement).className;
    bindExpression(exprSource, ctx, (value) => {
      (el as HTMLElement).className = clsx(base, value as ClassValue);
    });
    return;
  }

  bindExpression(exprSource, ctx, (value) => {
    el.classList.toggle(name, !!value);
  });
}
