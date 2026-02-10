import type { Expr } from "./types";
import { expressionPropsStoresSymbol } from "./props";

export type StorePredicate = (value: unknown) => boolean;

export function collectDependencies(
  expr: Expr,
  scope: Record<string, unknown>,
  isStore: StorePredicate,
): unknown[] {
  const deps: unknown[] = [];
  const seen = new Set<unknown>();

  const add = (value: unknown) => {
    if (!seen.has(value)) {
      seen.add(value);
      deps.push(value);
    }
  };

  const visit = (node: Expr) => {
    switch (node.type) {
      case "literal":
        return;
      case "ident": {
        const value = scope[node.name];
        if (isStore(value)) add(value);
        return;
      }
      case "member":
        addMemberDependency(node, scope, isStore, add);
        visit(node.object);
        return;
      case "index":
        addIndexDependency(node, scope, isStore, add);
        visit(node.object);
        visit(node.index);
        return;
      case "array":
        node.items.forEach(visit);
        return;
      case "object":
        node.entries.forEach((entry) => visit(entry.value));
        return;
      case "unary":
        visit(node.arg);
        return;
      case "binary":
        visit(node.left);
        visit(node.right);
        return;
      case "ternary":
        visit(node.test);
        visit(node.consequent);
        visit(node.alternate);
        return;
      case "call":
        visit(node.callee);
        node.args.forEach(visit);
        return;
      default:
        return;
    }
  };

  visit(expr);
  return deps;
}

function addMemberDependency(
  node: Extract<Expr, { type: "member" }>,
  scope: Record<string, unknown>,
  isStore: StorePredicate,
  add: (value: unknown) => void,
) {
  const object = resolveDependencyValue(node.object, scope);
  const value = readDependencyProperty(object, node.property);
  if (isStore(value)) add(value);
}

function addIndexDependency(
  node: Extract<Expr, { type: "index" }>,
  scope: Record<string, unknown>,
  isStore: StorePredicate,
  add: (value: unknown) => void,
) {
  const object = resolveDependencyValue(node.object, scope);
  const index = resolveDependencyValue(node.index, scope) as PropertyKey;
  const value = readDependencyProperty(object, index);
  if (isStore(value)) add(value);
}

function resolveDependencyValue(node: Expr, scope: Record<string, unknown>): unknown {
  switch (node.type) {
    case "literal":
      return node.value;
    case "ident":
      return scope[node.name];
    case "member": {
      const object = resolveDependencyValue(node.object, scope);
      return readDependencyProperty(object, node.property);
    }
    case "index": {
      const object = resolveDependencyValue(node.object, scope);
      const index = resolveDependencyValue(node.index, scope) as PropertyKey;
      return readDependencyProperty(object, index);
    }
    default:
      return undefined;
  }
}

function readDependencyProperty(object: unknown, property: PropertyKey): unknown {
  if (!object || (typeof object !== "object" && typeof object !== "function")) {
    return undefined;
  }

  const objectRecord = object as Record<PropertyKey, unknown>;
  const maybeStoreMap = objectRecord[expressionPropsStoresSymbol];
  if (maybeStoreMap && (typeof maybeStoreMap === "object" || typeof maybeStoreMap === "function")) {
    return (maybeStoreMap as Record<PropertyKey, unknown>)[property];
  }

  return objectRecord[property];
}
