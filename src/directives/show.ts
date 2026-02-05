import type { BindingContext } from '../context';
import { bindExpression } from './utils';

const SSR_ATTR = 'x-show-ssr';

export function processShow(el: Element, exprSource: string, ctx: BindingContext) {
  const element = el as HTMLElement;
  const original = element.style.display === 'none' ? '' : element.style.display;

  bindExpression(exprSource, ctx, (value) => {
    element.style.display = value ? original : 'none';
    if (value && element.hasAttribute(SSR_ATTR)) {
      element.removeAttribute(SSR_ATTR);
    }
  });
}
