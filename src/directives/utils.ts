import type { BindingContext } from "../context";
import { collectDependencies } from "../expression/deps";
import { evaluate } from "../expression/evaluator";
import { parse } from "../expression/parser";
import type { Expr } from "../expression/types";
import { isReactiveStore, readReactiveStoreValue, subscribeReactiveStore } from "../stores";

export type Specials = Record<string, unknown>;

const resolveValue = (ctx: BindingContext, value: unknown) =>
  isReactiveStore(value, ctx.adapter) ? readReactiveStoreValue(value, ctx.adapter) : value;

export function evaluateExpr(expr: Expr, ctx: BindingContext, specials: Specials = {}) {
  return evaluate(
    expr,
    ctx.scope,
    specials,
    (value) => resolveValue(ctx, value),
    (value) => isReactiveStore(value, ctx.adapter),
  );
}

export function bindExpression(
  source: string,
  ctx: BindingContext,
  callback: (value: unknown) => void,
  specials: Specials = {},
) {
  const expr = parse(source);
  return bindParsedExpression(expr, ctx, callback, () => evaluateExpr(expr, ctx, specials));
}

export function bindExpressionRaw(
  source: string,
  ctx: BindingContext,
  callback: (value: unknown) => void,
  specials: Specials = {},
) {
  const expr = parse(source);
  return bindParsedExpression(expr, ctx, callback, () =>
    expr.type === "ident"
      ? expr.name in specials
        ? specials[expr.name]
        : ctx.scope[expr.name]
      : evaluateExpr(expr, ctx, specials),
  );
}

function bindParsedExpression(
  expr: Expr,
  ctx: BindingContext,
  callback: (value: unknown) => void,
  compute: () => unknown,
) {
  let lastValue: unknown = bindExpressionUninitialized;
  const run = (force = false) => {
    const nextValue = compute();
    if (!force && Object.is(lastValue, nextValue)) return;
    lastValue = nextValue;
    callback(nextValue);
  };

  run();

  const deps = collectDependencies(expr, ctx.scope, (value) => isReactiveStore(value, ctx.adapter));
  for (const dep of deps) {
    const unsubscribe = subscribeReactiveStore(dep, ctx.adapter, () => run());
    ctx.disposers.add(unsubscribe);
  }

  return run;
}

const bindExpressionUninitialized = Symbol("bindExpressionUninitialized");
