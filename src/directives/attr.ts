import type { BindingContext } from "../context";
import { bindExpression } from "./utils";

export function processAttr(
  el: Element,
  exprSource: string,
  ctx: BindingContext,
  attrName: string,
) {
  const name = attrName.slice("x-attr:".length);
  if (!name) {
    throw new Error("x-attr requires a name");
  }

  bindExpression(exprSource, ctx, (value) => {
    if (value === false || value == null) {
      el.removeAttribute(name);
      return;
    }
    const attrValue = value === true ? "" : String(value);
    el.setAttribute(name, attrValue);
  });
}
