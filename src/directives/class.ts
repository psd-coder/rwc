import type { BindingContext } from '../context';
import { bindExpression } from './utils';

const baseClassCache = new WeakMap<Element, string>();
const CLASS_TOKEN_SPLIT_RE = /\s+/;

interface ClassResolution {
  enabledTokens: string[];
  disabledTokens: Set<string>;
}

function splitClassTokens(value: string): string[] {
  return value.split(CLASS_TOKEN_SPLIT_RE).filter(Boolean);
}

function isClassObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function collectClassObjectTokens(classObject: Record<string, unknown>, resolution: ClassResolution): void {
  for (const [rawKey, enabled] of Object.entries(classObject)) {
    const tokens = splitClassTokens(rawKey);
    if (enabled) {
      resolution.enabledTokens.push(...tokens);
      continue;
    }

    for (const token of tokens) {
      resolution.disabledTokens.add(token);
    }
  }
}

function resolveClassValue(value: unknown): ClassResolution {
  const resolution: ClassResolution = {
    enabledTokens: [],
    disabledTokens: new Set<string>(),
  };

  if (!value) return resolution;

  if (typeof value === 'string') {
    resolution.enabledTokens.push(...splitClassTokens(value));
    return resolution;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      if (!item) continue;
      if (typeof item === 'string') {
        resolution.enabledTokens.push(...splitClassTokens(item));
        continue;
      }
      if (isClassObject(item)) {
        collectClassObjectTokens(item, resolution);
      }
    }
    return resolution;
  }

  if (isClassObject(value)) {
    collectClassObjectTokens(value, resolution);
  }

  return resolution;
}

function mergeClassNames(base: string, value: unknown): string {
  const { enabledTokens, disabledTokens } = resolveClassValue(value);
  const nextTokens: string[] = [];
  const seen = new Set<string>();

  for (const token of splitClassTokens(base)) {
    if (disabledTokens.has(token) || seen.has(token)) continue;
    seen.add(token);
    nextTokens.push(token);
  }

  for (const token of enabledTokens) {
    if (disabledTokens.has(token) || seen.has(token)) continue;
    seen.add(token);
    nextTokens.push(token);
  }

  return nextTokens.join(' ');
}

export function processClass(el: Element, exprSource: string, ctx: BindingContext, attrName: string) {
  const name = attrName.startsWith('x-class:') ? attrName.slice('x-class:'.length) : '';

  if (!name) {
    const element = el as HTMLElement;
    let base = baseClassCache.get(el);
    if (base === undefined) {
      base = element.className;
      baseClassCache.set(el, base);
    }
    bindExpression(exprSource, ctx, (value) => {
      element.className = mergeClassNames(base, value);
    });
    return;
  }

  bindExpression(exprSource, ctx, (value) => {
    el.classList.toggle(name, !!value);
  });
}
