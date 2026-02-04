import type { BindingContext } from '../context';
import { collectDependencies } from '../expression/deps';
import { evaluate } from '../expression/evaluator';
import { parse } from '../expression/parser';
import type { Expr } from '../expression/types';

export type Specials = Record<string, unknown>;

const resolveValue = (ctx: BindingContext, value: unknown) =>
  ctx.adapter.isStore(value) ? ctx.adapter.get(value) : value;

export function evaluateExpr(expr: Expr, ctx: BindingContext, specials: Specials = {}) {
  return evaluate(
    expr,
    ctx.scope,
    specials,
    value => resolveValue(ctx, value),
    value => ctx.adapter.isStore(value)
  );
}

export function bindExpression(
  source: string,
  ctx: BindingContext,
  callback: (value: unknown) => void,
  specials: Specials = {}
) {
  const expr = parse(source);
  let lastValue: unknown = bindExpressionUninitialized;
  const run = () => {
    const nextValue = evaluateExpr(expr, ctx, specials);
    if (Object.is(lastValue, nextValue)) return;
    lastValue = nextValue;
    callback(nextValue);
  };

  run();

  const deps = collectDependencies(expr, ctx.scope, value => ctx.adapter.isStore(value));
  for (const dep of deps) {
    const unsubscribe = ctx.adapter.subscribe(dep, run);
    ctx.disposers.add(unsubscribe);
  }

  return run;
}

export function bindExpressionRaw(
  source: string,
  ctx: BindingContext,
  callback: (value: unknown) => void,
  specials: Specials = {}
) {
  const expr = parse(source);
  let lastValue: unknown = bindExpressionUninitialized;
  const run = () => {
    const nextValue =
      expr.type === 'ident'
        ? (expr.name in specials ? specials[expr.name] : ctx.scope[expr.name])
        : evaluateExpr(expr, ctx, specials);
    if (Object.is(lastValue, nextValue)) return;
    lastValue = nextValue;
    callback(nextValue);
  };

  run();

  const deps = collectDependencies(expr, ctx.scope, value => ctx.adapter.isStore(value));
  for (const dep of deps) {
    const unsubscribe = ctx.adapter.subscribe(dep, run);
    ctx.disposers.add(unsubscribe);
  }

  return run;
}

const bindExpressionUninitialized = Symbol('bindExpressionUninitialized');
