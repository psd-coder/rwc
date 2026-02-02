import type { Expr } from './types';

export type StorePredicate = (value: unknown) => boolean;

export function collectDependencies(
  expr: Expr,
  scope: Record<string, unknown>,
  isStore: StorePredicate
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
      case 'literal':
        return;
      case 'ident': {
        const value = scope[node.name];
        if (isStore(value)) add(value);
        return;
      }
      case 'member':
        visit(node.object);
        return;
      case 'index':
        visit(node.object);
        visit(node.index);
        return;
      case 'unary':
        visit(node.arg);
        return;
      case 'binary':
        visit(node.left);
        visit(node.right);
        return;
      case 'ternary':
        visit(node.test);
        visit(node.consequent);
        visit(node.alternate);
        return;
      case 'call':
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
