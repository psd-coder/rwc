import type { Expr, CallExpr } from './types';

export type ValueResolver = (value: unknown) => unknown;
export type StorePredicate = (value: unknown) => boolean;

export function evaluate(
  expr: Expr,
  scope: Record<string, unknown>,
  specials: Record<string, unknown> = {},
  resolve: ValueResolver = value => value,
  isStore: StorePredicate = () => false
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
      const object = evaluate(expr.object, scope, specials, resolve, isStore) as
        | Record<PropertyKey, unknown>
        | null
        | undefined;
      return object?.[expr.property];
    }
    case 'index': {
      const object = evaluate(expr.object, scope, specials, resolve, isStore) as
        | Record<PropertyKey, unknown>
        | null
        | undefined;
      const index = evaluate(expr.index, scope, specials, resolve, isStore) as PropertyKey;
      return object?.[index];
    }
    case 'array':
      return expr.items.map(item => evaluate(item, scope, specials, resolve, isStore));
    case 'object': {
      const result: Record<string, unknown> = {};
      for (const entry of expr.entries) {
        result[entry.key] = evaluate(entry.value, scope, specials, resolve, isStore);
      }
      return result;
    }
    case 'unary': {
      const value = evaluate(expr.arg, scope, specials, resolve, isStore);
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
        const left = evaluate(expr.left, scope, specials, resolve, isStore);
        return left ? evaluate(expr.right, scope, specials, resolve, isStore) : left;
      }
      if (expr.op === '||') {
        const left = evaluate(expr.left, scope, specials, resolve, isStore);
        return left ? left : evaluate(expr.right, scope, specials, resolve, isStore);
      }
      const left = evaluate(expr.left, scope, specials, resolve, isStore);
      const right = evaluate(expr.right, scope, specials, resolve, isStore);
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
      const test = evaluate(expr.test, scope, specials, resolve, isStore);
      return test
        ? evaluate(expr.consequent, scope, specials, resolve, isStore)
        : evaluate(expr.alternate, scope, specials, resolve, isStore);
    }
    case 'call':
      return evaluateCall(expr, scope, specials, resolve, isStore);
    default:
      throw new Error('Unknown expression');
  }
}

function evaluateCall(
  expr: CallExpr,
  scope: Record<string, unknown>,
  specials: Record<string, unknown>,
  resolve: ValueResolver,
  isStore: StorePredicate
): unknown {
  const args = expr.args.map(arg => evaluate(arg, scope, specials, resolve, isStore));

  if (expr.callee.type === 'member') {
    const object = evaluateCallObject(expr.callee.object, scope, specials, resolve, isStore, true) as
      | Record<PropertyKey, unknown>
      | null
      | undefined;
    const fn = object?.[expr.callee.property];
    if (typeof fn === 'function') {
      return fn.apply(object, args);
    }

    const fallbackObject = evaluateCallObject(expr.callee.object, scope, specials, resolve, isStore, false) as
      | Record<PropertyKey, unknown>
      | null
      | undefined;
    const fallbackFn = fallbackObject?.[expr.callee.property];
    if (typeof fallbackFn === 'function') {
      return fallbackFn.apply(fallbackObject, args);
    }

    throw new Error('Call target is not a function');
  }

  if (expr.callee.type === 'index') {
    const index = evaluate(expr.callee.index, scope, specials, resolve, isStore) as PropertyKey;
    const object = evaluateCallObject(expr.callee.object, scope, specials, resolve, isStore, true) as
      | Record<PropertyKey, unknown>
      | null
      | undefined;
    const fn = object?.[index];
    if (typeof fn === 'function') {
      return fn.apply(object, args);
    }

    const fallbackObject = evaluateCallObject(expr.callee.object, scope, specials, resolve, isStore, false) as
      | Record<PropertyKey, unknown>
      | null
      | undefined;
    const fallbackFn = fallbackObject?.[index];
    if (typeof fallbackFn === 'function') {
      return fallbackFn.apply(fallbackObject, args);
    }

    throw new Error('Call target is not a function');
  }

  const fn = evaluate(expr.callee, scope, specials, resolve, isStore);
  if (typeof fn !== 'function') {
    throw new Error('Call target is not a function');
  }
  return fn(...args);
}

function evaluateCallObject(
  expr: Expr,
  scope: Record<string, unknown>,
  specials: Record<string, unknown>,
  resolve: ValueResolver,
  isStore: StorePredicate,
  preferStore: boolean
): unknown {
  switch (expr.type) {
    case 'ident': {
      if (expr.name in specials) {
        return specials[expr.name];
      }
      const value = scope[expr.name];
      if (preferStore && isStore(value)) {
        return value;
      }
      return resolve(value);
    }
    case 'member': {
      const object = evaluateCallObject(expr.object, scope, specials, resolve, isStore, preferStore) as
        | Record<PropertyKey, unknown>
        | null
        | undefined;
      return object?.[expr.property];
    }
    case 'index': {
      const object = evaluateCallObject(expr.object, scope, specials, resolve, isStore, preferStore) as
        | Record<PropertyKey, unknown>
        | null
        | undefined;
      const index = evaluate(expr.index, scope, specials, resolve, isStore) as PropertyKey;
      return object?.[index];
    }
    default:
      return evaluate(expr, scope, specials, resolve, isStore);
  }
}
