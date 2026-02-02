import type { BindingContext } from '../context';
import { bindExpression } from './utils';

export function processText(el: Element, exprSource: string, ctx: BindingContext) {
  bindExpression(exprSource, ctx, (value) => {
    el.textContent = value == null ? '' : String(value);
  });
}
