import type { BindingContext } from "../context";
import { bindExpression } from "./utils";

export function processText(el: Element, exprSource: string, ctx: BindingContext) {
  let lastText = el.textContent ?? "";
  bindExpression(exprSource, ctx, (value) => {
    const nextText = value == null ? "" : String(value);
    if (nextText === lastText) return;
    el.textContent = nextText;
    lastText = nextText;
  });
}
