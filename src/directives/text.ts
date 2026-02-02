import type { BindingContext } from '../context';
import { parse } from '../expression/parser';
import { evaluate } from '../expression/evaluator';
import { collectDependencies } from '../expression/deps';

export function processText(el: Element, exprSource: string, ctx: BindingContext) {
  const expr = parse(exprSource);

  const render = () => {
    const value = evaluate(expr, ctx.scope, {}, (value) =>
      ctx.adapter.isStore(value) ? ctx.adapter.get(value) : value
    );
    el.textContent = value == null ? '' : String(value);
  };

  render();

  const deps = collectDependencies(expr, ctx.scope, value => ctx.adapter.isStore(value));
  for (const dep of deps) {
    const unsubscribe = ctx.adapter.subscribe(dep, render);
    ctx.disposers.add(unsubscribe);
  }
}
