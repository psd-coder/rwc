import type { BindingContext } from '../context';
import { bindExpression } from './utils';

export function processStyle(el: Element, exprSource: string, ctx: BindingContext, attrName: string) {
  const prop = attrName.slice('x-style:'.length);
  if (!prop) {
    throw new Error('x-style requires a property');
  }

  bindExpression(exprSource, ctx, (value) => {
    const element = el as HTMLElement;
    if (value === false || value == null) {
      element.style.removeProperty(prop);
      return;
    }
    element.style.setProperty(prop, String(value));
  });
}
