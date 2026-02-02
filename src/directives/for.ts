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
  const { itemName, indexName, listExpr } = parseForExpression(exprSource);
  const isTemplate = el instanceof HTMLTemplateElement;
  let template: HTMLTemplateElement;
  let anchor: ChildNode;
  let anchorInserted = false;

  if (isTemplate) {
    template = el;
    anchor = document.createComment('x-for');
  } else {
    const parent = el.parentNode;
    if (!parent) return;
    const placeholder = document.createComment('x-for');
    parent.insertBefore(placeholder, el);
    el.removeAttribute('x-for');
    template = document.createElement('template');
    template.content.append(el);
    anchor = placeholder;
    anchorInserted = true;
  }

  const parent = isTemplate ? template.parentNode : anchor.parentNode;
  if (!parent) return;

  const entries = new Map<unknown, Entry>();
  let hydrationAttempted = false;
  let lastOrder: unknown[] | null = null;

  const isIgnorableText = (node: Node) =>
    node.nodeType === Node.TEXT_NODE && !node.textContent?.trim();

  const templatePattern = Array.from(template.content.childNodes).filter(node => !isIgnorableText(node));

  const matchesPattern = (node: Node, patternNode: Node) => {
    if (node.nodeType !== patternNode.nodeType) return false;
    if (node.nodeType === Node.ELEMENT_NODE) {
      return (node as Element).tagName === (patternNode as Element).tagName;
    }
    return true;
  };

  const ensureAnchor = (afterNode: ChildNode | null = null) => {
    if (anchorInserted) return;
    const refNode =
      afterNode && afterNode.parentNode === parent ? afterNode.nextSibling : template.nextSibling;
    parent.insertBefore(anchor, refNode);
    anchorInserted = true;
  };

  const bindEntryNodes = (nodes: Node[], childCtx: BindingContext) => {
    for (const node of nodes) {
      if (node instanceof Element) {
        processDirectives(node, childCtx);
      }
    }
  };

  const disposeEntry = (entry: Entry, removeNodes = true) => {
    for (const dispose of entry.ctx.disposers) {
      dispose();
    }
    if (removeNodes) {
      entry.nodes.forEach(node => node.parentNode?.removeChild(node));
    }
  };

  const createEntry = (item: unknown, index: number, nodesOverride?: Node[]): Entry => {
    const scopeOverrides: Record<string, unknown> = { [itemName]: item, $index: index };
    if (indexName) scopeOverrides[indexName] = index;
    const childCtx = createChildContext(ctx, scopeOverrides);
    if (nodesOverride) {
      bindEntryNodes(nodesOverride, childCtx);
      return { key: getKey(item, index), item, index, ctx: childCtx, nodes: nodesOverride };
    }
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
    bindEntryNodes(entry.nodes, nextCtx);
  };

  const hydrateEntries = (items: unknown[]) => {
    if (hydrationAttempted || !isTemplate) return;
    hydrationAttempted = true;

    if (items.length === 0 || templatePattern.length === 0) {
      ensureAnchor();
      return;
    }

    const groups: Node[][] = [];
    let current: Node[] = [];
    let patternIndex = 0;
    let entryIndex = 0;
    let lastNode: ChildNode | null = null;
    let node = template.nextSibling;

    while (node && entryIndex < items.length) {
      const next = node.nextSibling;
      if (isIgnorableText(node)) {
        current.push(node);
        lastNode = node;
        node = next;
        continue;
      }

      const expected = templatePattern[patternIndex];
      if (!expected || !matchesPattern(node, expected)) {
        ensureAnchor();
        return;
      }

      current.push(node);
      lastNode = node;
      patternIndex += 1;

      if (patternIndex === templatePattern.length) {
        groups.push(current);
        current = [];
        patternIndex = 0;
        entryIndex += 1;
      }

      node = next;
    }

    if (entryIndex !== items.length || patternIndex !== 0) {
      ensureAnchor();
      return;
    }

    groups.forEach((nodes, index) => {
      const entry = createEntry(items[index], index, nodes);
      entries.set(entry.key, entry);
    });

    ensureAnchor(lastNode);
  };

  const update = (value: unknown) => {
    const items = Array.isArray(value) ? value : [];
    hydrateEntries(items);
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

    const nextOrder = ordered.map(entry => entry.key);
    const missingNodes = ordered.some(entry => entry.nodes.some(node => node.parentNode !== parent));
    let orderChanged = true;
    if (lastOrder && lastOrder.length === nextOrder.length) {
      const previous = lastOrder;
      orderChanged = nextOrder.some((key, index) => key !== previous[index]);
    }

    if (missingNodes || orderChanged) {
      for (const entry of ordered) {
        for (const node of entry.nodes) {
          parent.insertBefore(node, anchor);
        }
      }
    }

    lastOrder = nextOrder;
  };

  bindExpression(listExpr, ctx, update);
  ctx.disposers.add(() => {
    for (const entry of entries.values()) {
      disposeEntry(entry);
    }
    anchor.remove();
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
