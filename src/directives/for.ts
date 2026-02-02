import type { BindingContext } from '../context';
import { createChildContext } from '../context';
import { bindExpression } from './utils';

type ForParts = {
  itemName: string;
  indexName?: string;
  listExpr: string;
};

type Entry = {
  key: unknown;
  item: unknown;
  index: number;
  ctx: BindingContext;
  nodes: Node[];
};

type DirectiveProcessor = (root: ParentNode, ctx: BindingContext) => void;

export function processFor(
  el: Element,
  exprSource: string,
  ctx: BindingContext,
  processDirectives: DirectiveProcessor
) {
  if (!(el instanceof HTMLTemplateElement)) {
    throw new Error('x-for must be used on a <template>');
  }

  const { itemName, indexName, listExpr } = parseForExpression(exprSource);
  const template = el;
  const parent = template.parentNode;
  if (!parent) return;

  const endMarker = document.createComment('x-for');
  template.after(endMarker);

  const entries = new Map<unknown, Entry>();

  const disposeEntry = (entry: Entry, removeNodes = true) => {
    for (const dispose of entry.ctx.disposers) {
      dispose();
    }
    if (removeNodes) {
      entry.nodes.forEach(node => node.parentNode?.removeChild(node));
    }
  };

  const createEntry = (item: unknown, index: number): Entry => {
    const scopeOverrides: Record<string, unknown> = { [itemName]: item, $index: index };
    if (indexName) scopeOverrides[indexName] = index;
    const childCtx = createChildContext(ctx, scopeOverrides);
    const fragment = template.content.cloneNode(true) as DocumentFragment;
    processDirectives(fragment, childCtx);
    const nodes = Array.from(fragment.childNodes);
    return { key: getKey(item, index), item, index, ctx: childCtx, nodes };
  };

  const rebindEntry = (entry: Entry, item: unknown, index: number) => {
    disposeEntry(entry, false);
    const scopeOverrides: Record<string, unknown> = { [itemName]: item, $index: index };
    if (indexName) scopeOverrides[indexName] = index;
    const nextCtx = createChildContext(ctx, scopeOverrides);
    entry.ctx = nextCtx;
    entry.item = item;
    entry.index = index;
    for (const node of entry.nodes) {
      if (node instanceof Element) {
        processDirectives(node, nextCtx);
      }
    }
  };

  const update = (value: unknown) => {
    const items = Array.isArray(value) ? value : [];
    const nextKeys = new Set<unknown>();
    const ordered: Entry[] = [];

    items.forEach((item, index) => {
      const key = getKey(item, index);
      nextKeys.add(key);
      let entry = entries.get(key);

      if (!entry) {
        entry = createEntry(item, index);
        entries.set(key, entry);
      } else if (entry.item !== item || entry.index !== index) {
        rebindEntry(entry, item, index);
      } else {
        entry.ctx.scope[itemName] = item;
        entry.ctx.scope.$index = index;
        if (indexName) entry.ctx.scope[indexName] = index;
        entry.index = index;
      }

      ordered.push(entry);
    });

    for (const [key, entry] of entries) {
      if (!nextKeys.has(key)) {
        disposeEntry(entry);
        entries.delete(key);
      }
    }

    for (const entry of ordered) {
      for (const node of entry.nodes) {
        parent.insertBefore(node, endMarker);
      }
    }
  };

  bindExpression(listExpr, ctx, update);
  ctx.disposers.add(() => {
    for (const entry of entries.values()) {
      disposeEntry(entry);
    }
    endMarker.remove();
  });
}

function parseForExpression(source: string): ForParts {
  const match = source.match(/^\s*(?:\(([^)]+)\)|([^ ]+))\s+in\s+(.+)$/);
  if (!match) {
    throw new Error('Invalid x-for expression');
  }

  const names = (match[1] ?? match[2])
    .split(',')
    .map(name => name.trim())
    .filter(Boolean);

  const itemName = names[0];
  if (!itemName) {
    throw new Error('x-for requires an item identifier');
  }

  const indexName = names[1];
  const listExpr = match[3].trim();
  if (!listExpr) {
    throw new Error('x-for requires a list expression');
  }

  return { itemName, indexName, listExpr };
}

function getKey(item: unknown, index: number) {
  if (item && typeof item === 'object') {
    const candidate = (item as { id?: unknown; key?: unknown }).id ?? (item as { key?: unknown }).key;
    if (candidate != null) return candidate;
  }
  return index;
}
