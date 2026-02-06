import type { BindingContext } from "../context";
import { collectDependencies } from "../expression/deps";
import { parse } from "../expression/parser";
import type { Expr, ObjectExpr } from "../expression/types";
import { evaluateExpr, type Specials } from "./utils";

const PREFIX = "x-bind:";
const bindExpressionUninitialized = Symbol("bindExpressionUninitialized");

type BindingSpec = {
  getter: Expr;
  setter: Expr | null;
};

export function processBind(el: Element, exprSource: string, ctx: BindingContext, attrName: string) {
  const descriptor = attrName.slice(PREFIX.length);
  const parts = descriptor.split(".").filter(Boolean);
  const prop = parts.shift();
  if (!prop) {
    throw new Error("x-bind requires a property name");
  }
  if (parts.length > 1) {
    throw new Error("x-bind accepts at most one event modifier");
  }

  const eventName = parts[0] ?? inferBindingEvent(el, prop);
  const sourceExpr = parse(exprSource);
  const binding = parseBindingSpec(sourceExpr);

  bindGetter(binding.getter, ctx, (value) => {
    const element = el as unknown as Record<string, unknown>;
    element[prop] = value;
  });

  const handler = (event: Event) => {
    const element = el as unknown as Record<string, unknown>;
    const nextValue = element[prop];
    const specials: Specials = { $value: nextValue, $event: event, $el: el };

    if (binding.setter) {
      applyExplicitSetter(binding.setter, ctx, specials, nextValue);
      return;
    }

    const target = resolveReferenceRaw(sourceExpr, ctx, specials);
    if (writeToTarget(target, nextValue)) {
      return;
    }

    throw new Error("x-bind shorthand requires a writable store target with set(value); use { get, set }");
  };

  el.addEventListener(eventName, handler);
  ctx.disposers.add(() => el.removeEventListener(eventName, handler));
}

function parseBindingSpec(expr: Expr): BindingSpec {
  if (expr.type !== "object") {
    return { getter: expr, setter: null };
  }

  const getter = getObjectEntry(expr, "get");
  const setter = getObjectEntry(expr, "set");
  if (!getter && !setter) {
    return { getter: expr, setter: null };
  }
  if (!getter || !setter) {
    throw new Error('x-bind object expression requires both "get" and "set"');
  }
  return { getter, setter };
}

function getObjectEntry(expr: ObjectExpr, key: string): Expr | null {
  for (const entry of expr.entries) {
    if (entry.key === key) {
      return entry.value;
    }
  }
  return null;
}

function bindGetter(expr: Expr, ctx: BindingContext, callback: (value: unknown) => void) {
  let lastValue: unknown = bindExpressionUninitialized;
  const run = () => {
    const nextValue = evaluateExpr(expr, ctx);
    if (Object.is(lastValue, nextValue)) {
      return;
    }
    lastValue = nextValue;
    callback(nextValue);
  };

  run();

  const deps = collectDependencies(expr, ctx.scope, (value) => ctx.adapter.isStore(value));
  for (const dep of deps) {
    const unsubscribe = ctx.adapter.subscribe(dep, run);
    ctx.disposers.add(unsubscribe);
  }
}

function applyExplicitSetter(
  setterExpr: Expr,
  ctx: BindingContext,
  specials: Specials,
  nextValue: unknown,
) {
  if (setterExpr.type === "call") {
    evaluateExpr(setterExpr, ctx, specials);
    return;
  }

  const candidate = evaluateSetterTarget(setterExpr, ctx, specials);
  if (typeof candidate === "function") {
    candidate.call(ctx.scope, nextValue, specials.$event, specials.$el);
    return;
  }
  if (writeToTarget(candidate, nextValue)) {
    return;
  }

  throw new Error(
    "x-bind setter must be a function, a call expression, or a writable store target with set(value)",
  );
}

function evaluateSetterTarget(expr: Expr, ctx: BindingContext, specials: Specials): unknown {
  if (expr.type === "ident") {
    if (expr.name in specials) {
      return specials[expr.name];
    }
    return ctx.scope[expr.name];
  }
  return evaluateExpr(expr, ctx, specials);
}

function resolveReferenceRaw(expr: Expr, ctx: BindingContext, specials: Specials): unknown {
  if (expr.type === "ident") {
    if (expr.name in specials) {
      return specials[expr.name];
    }
    return ctx.scope[expr.name];
  }
  if (expr.type === "member") {
    const object = resolveReferenceRaw(expr.object, ctx, specials) as
      | Record<PropertyKey, unknown>
      | null
      | undefined;
    if (!object) {
      return undefined;
    }
    return object[expr.property];
  }
  if (expr.type === "index") {
    const object = resolveReferenceRaw(expr.object, ctx, specials) as
      | Record<PropertyKey, unknown>
      | null
      | undefined;
    if (!object) {
      return undefined;
    }
    const index = evaluateExpr(expr.index, ctx, specials) as PropertyKey;
    return object[index];
  }
  return undefined;
}

function writeToTarget(target: unknown, nextValue: unknown): boolean {
  if (!target || typeof target !== "object") {
    return false;
  }

  const mutable = target as { set?: (value: unknown) => unknown };
  if (typeof mutable.set === "function") {
    mutable.set(nextValue);
    return true;
  }
  return false;
}

function inferBindingEvent(el: Element, prop: string): string {
  if (prop === "checked") {
    return "change";
  }
  if (el instanceof HTMLSelectElement) {
    return "change";
  }
  if (el instanceof HTMLInputElement) {
    const type = el.type.toLowerCase();
    if (type === "checkbox" || type === "radio" || type === "file") {
      return "change";
    }
  }
  return "input";
}
