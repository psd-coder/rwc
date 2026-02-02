import type { BindingContext } from '../context';
import { bindExpression } from './utils';

export function processShow(el: Element, exprSource: string, ctx: BindingContext) {
  const element = el as HTMLElement;
  const original = element.style.display;

  bindExpression(exprSource, ctx, (value) => {
    element.style.display = value ? original : 'none';
  });
}
