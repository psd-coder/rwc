import type { BindingContext } from '../context';

export function processRef(el: Element, refName: string, ctx: BindingContext) {
  const name = refName.trim();
  if (!name) return;

  const scope = ctx.scope as Record<string, unknown>;
  const refs = (scope.$refs as Record<string, HTMLElement> | undefined) ?? {};
  scope.$refs = refs;
  refs[name] = el as HTMLElement;

  ctx.disposers.add(() => {
    if (refs[name] === el) {
      delete refs[name];
    }
  });
}
