import type { BindingContext } from "../context";
import { bindExpression } from "./utils";

export function processHtml(el: Element, exprSource: string, ctx: BindingContext) {
  bindExpression(exprSource, ctx, (value) => {
    (el as HTMLElement).innerHTML = value == null ? "" : String(value);
  });
}
