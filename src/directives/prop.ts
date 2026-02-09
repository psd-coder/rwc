import type { BindingContext } from "../context";
import { bindExpression, bindExpressionRaw } from "./utils";

export function processProp(el: Element, exprSource: string, ctx: BindingContext, attrName: string) {
  const prop = attrName.slice("x-prop:".length);
  if (!prop) {
    throw new Error("x-prop requires a name");
  }

  const bind = el.tagName.includes("-") ? bindExpressionRaw : bindExpression;
  const element = el as unknown as Record<string, unknown>;
  bind(exprSource, ctx, (value: unknown) => {
    element[prop] = value;
  });
}
