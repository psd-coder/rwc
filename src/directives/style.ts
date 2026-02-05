import type { BindingContext } from '../context';
import { bindExpression } from './utils';

export function processStyle(el: Element, exprSource: string, ctx: BindingContext, attrName: string) {
  const isPropertyBinding = attrName.startsWith('x-style:');
  const prop = isPropertyBinding ? attrName.slice('x-style:'.length) : '';
  if (isPropertyBinding && !prop) {
    throw new Error('x-style requires a property');
  }
  if (!prop) {
    const element = el as HTMLElement;
    const applied = new Set<string>();
    const styleRecord = element.style as unknown as Record<string, string>;

    const setStyleValue = (name: string, value: unknown) => {
      const stringValue = String(value);
      if (name.startsWith('--') || name.includes('-')) {
        element.style.setProperty(name, stringValue);
      } else {
        styleRecord[name] = stringValue;
      }
    };

    const removeStyleValue = (name: string) => {
      if (name.startsWith('--') || name.includes('-')) {
        element.style.removeProperty(name);
      } else {
        styleRecord[name] = '';
      }
    };

    bindExpression(exprSource, ctx, (value) => {
      if (!value || typeof value !== 'object' || Array.isArray(value)) {
        for (const name of applied) {
          removeStyleValue(name);
        }
        applied.clear();
        return;
      }

      const next = value as Record<string, unknown>;
      for (const name of Array.from(applied)) {
        if (!(name in next)) {
          removeStyleValue(name);
          applied.delete(name);
        }
      }

      for (const [name, styleValue] of Object.entries(next)) {
        if (styleValue === false || styleValue == null) {
          removeStyleValue(name);
          applied.delete(name);
          continue;
        }
        setStyleValue(name, styleValue);
        applied.add(name);
      }
    });
    return;
  }

  bindExpression(exprSource, ctx, (value) => {
    const element = el as HTMLElement;
    if (value === false || value == null) {
      element.style.removeProperty(prop);
      return;
    }
    element.style.setProperty(prop, String(value));
  });
}
