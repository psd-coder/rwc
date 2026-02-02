import type { Expr, CallExpr } from './types';

export type ValueResolver = (value: unknown) => unknown;

export function evaluate(
  expr: Expr,
  scope: Record<string, unknown>,
  specials: Record<string, unknown> = {},
  resolve: ValueResolver = value => value
): unknown {
  switch (expr.type) {
    case 'literal':
      return expr.value;
    case 'ident': {
      if (expr.name in specials) {
        return specials[expr.name];
      }
      return resolve(scope[expr.name]);
    }
    case 'member': {
      const object = evaluate(expr.object, scope, specials, resolve) as
        | Record<PropertyKey, unknown>
        | null
        | undefined;
      return object?.[expr.property];
    }
    case 'index': {
      const object = evaluate(expr.object, scope, specials, resolve) as
        | Record<PropertyKey, unknown>
        | null
        | undefined;
      const index = evaluate(expr.index, scope, specials, resolve) as PropertyKey;
      return object?.[index];
    }
    case 'unary': {
      const value = evaluate(expr.arg, scope, specials, resolve);
      switch (expr.op) {
        case '!':
          return !value;
        case '-':
          return -(value as number);
        case '+':
          return +(value as number);
        default:
          throw new Error('Unsupported unary operator');
      }
    }
    case 'binary': {
      if (expr.op === '&&') {
        const left = evaluate(expr.left, scope, specials, resolve);
        return left ? evaluate(expr.right, scope, specials, resolve) : left;
      }
      if (expr.op === '||') {
        const left = evaluate(expr.left, scope, specials, resolve);
        return left ? left : evaluate(expr.right, scope, specials, resolve);
      }
      const left = evaluate(expr.left, scope, specials, resolve);
      const right = evaluate(expr.right, scope, specials, resolve);
      switch (expr.op) {
        case '===':
          return left === right;
        case '!==':
          return left !== right;
        case '<':
          return (left as number) < (right as number);
        case '<=':
          return (left as number) <= (right as number);
        case '>':
          return (left as number) > (right as number);
        case '>=':
          return (left as number) >= (right as number);
        case '+':
          return (left as number) + (right as number);
        case '-':
          return (left as number) - (right as number);
        case '*':
          return (left as number) * (right as number);
        case '/':
          return (left as number) / (right as number);
        default:
          throw new Error(`Unsupported binary operator ${expr.op}`);
      }
    }
    case 'ternary': {
      const test = evaluate(expr.test, scope, specials, resolve);
      return test ? evaluate(expr.consequent, scope, specials, resolve) : evaluate(expr.alternate, scope, specials, resolve);
    }
    case 'call':
      return evaluateCall(expr, scope, specials, resolve);
    default:
      throw new Error('Unknown expression');
  }
}

function evaluateCall(
  expr: CallExpr,
  scope: Record<string, unknown>,
  specials: Record<string, unknown>,
  resolve: ValueResolver
): unknown {
  const args = expr.args.map(arg => evaluate(arg, scope, specials, resolve));

  if (expr.callee.type === 'member') {
    const object = evaluate(expr.callee.object, scope, specials, resolve) as
      | Record<PropertyKey, unknown>
      | null
      | undefined;
    const fn = object?.[expr.callee.property];
    if (typeof fn !== 'function') {
      throw new Error('Call target is not a function');
    }
    return fn.apply(object, args);
  }

  if (expr.callee.type === 'index') {
    const object = evaluate(expr.callee.object, scope, specials, resolve) as
      | Record<PropertyKey, unknown>
      | null
      | undefined;
    const index = evaluate(expr.callee.index, scope, specials, resolve) as PropertyKey;
    const fn = object?.[index];
    if (typeof fn !== 'function') {
      throw new Error('Call target is not a function');
    }
    return fn.apply(object, args);
  }

  const fn = evaluate(expr.callee, scope, specials, resolve);
  if (typeof fn !== 'function') {
    throw new Error('Call target is not a function');
  }
  return fn(...args);
}
