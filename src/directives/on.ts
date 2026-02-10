import type { BindingContext } from "../context";
import { evaluateExpr } from "./utils";
import { parse } from "../expression/parser";

const PREFIX = "x-on:";

export function processOn(el: Element, exprSource: string, ctx: BindingContext, attrName: string) {
  const descriptor = attrName.slice(PREFIX.length);
  const parts = descriptor.split(".").filter(Boolean);
  const event = parts.shift();
  if (!event) {
    throw new Error("x-on requires an event name");
  }

  const modifiers = new Set(parts);
  const options: AddEventListenerOptions = {
    once: modifiers.has("once"),
    capture: modifiers.has("capture"),
  };

  const expr = parse(exprSource);
  const handler = (eventObject: Event) => {
    if (modifiers.has("prevent")) eventObject.preventDefault();
    if (modifiers.has("stop")) eventObject.stopPropagation();

    const specials = { $event: eventObject, $el: el };
    if (expr.type === "call") {
      evaluateExpr(expr, ctx, specials);
      return;
    }

    const result = evaluateExpr(expr, ctx, specials);
    if (typeof result === "function") {
      result.call(ctx.scope, eventObject);
    }
  };

  el.addEventListener(event, handler, options);
  ctx.disposers.add(() => el.removeEventListener(event, handler, options));
}
