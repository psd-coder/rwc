import type { BindingContext } from '../context';
import { bindExpression } from './utils';

export function processProp(el: Element, exprSource: string, ctx: BindingContext, attrName: string) {
  const prop = attrName.slice('x-prop:'.length);
  if (!prop) {
    throw new Error('x-prop requires a name');
  }

  bindExpression(exprSource, ctx, (value) => {
    const element = el as unknown as Record<string, unknown>;
    element[prop] = value;
  });
}
