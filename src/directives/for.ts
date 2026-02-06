import type { BindingContext } from '../context';
import { createBindingContext, createChildContext } from '../context';
import { bindExpression, evaluateExpr } from './utils';
import { setupTemplate } from './_utils';
import { markHydratedNodes } from './hydration';
import { parse } from '../expression/parser';
import type { ProcessOptions } from './registry';

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

type DirectiveProcessor = (root: ParentNode, ctx: BindingContext, options?: ProcessOptions) => void;

export function processFor(
  el: Element,
  exprSource: string,
  ctx: BindingContext,
  processDirectives: DirectiveProcessor
) {
  const { itemName, indexName, listExpr } = parseForExpression(exprSource);
  const keyExprSource = el.getAttribute('x-key');
  if (!keyExprSource) {
    throw new Error('x-for requires x-key');
  }
  const keyExpr = parse(keyExprSource);
  const isTemplate = el instanceof HTMLTemplateElement;
  let template: HTMLTemplateElement;
  let parent: ParentNode | null = null;
  let hydrationRoot: ChildNode | null = null;
  const anchor = document.createComment('x-for');

  if (isTemplate) {
    const templateSetup = setupTemplate(el, 'x-for');
    if (!templateSetup) return;
    template = templateSetup.template;
    parent = template.parentNode;
  } else {
    parent = el.parentNode;
    if (!parent) return;
    const clone = el.cloneNode(true) as Element;
    clone.removeAttribute('x-for');
    clone.removeAttribute('x-key');
    template = document.createElement('template');
    template.content.append(clone);
    el.removeAttribute('x-for');
    el.removeAttribute('x-key');
    hydrationRoot = el;
  }
  if (!parent) return;

  const entries = new Map<unknown, Entry>();
  let hydrationAttempted = false;
  let lastOrder: unknown[] | null = null;

  const isIgnorableText = (node: Node) =>
    (node.nodeType === Node.TEXT_NODE && !node.textContent?.trim()) ||
    node.nodeType === Node.COMMENT_NODE;

  const templatePattern = Array.from(template.content.childNodes).filter(node => !isIgnorableText(node));

  const matchesPattern = (node: Node, patternNode: Node) => {
    if (node.nodeType !== patternNode.nodeType) return false;
    if (node.nodeType === Node.ELEMENT_NODE) {
      return (node as Element).tagName === (patternNode as Element).tagName;
    }
    return true;
  };

  const ensureAnchor = (refNode: ChildNode | null) => {
    parent.insertBefore(anchor, refNode);
  };

  const clearForAttrs = (nodes: Node[]) => {
    for (const node of nodes) {
      if (node instanceof Element) {
        node.removeAttribute('x-for');
        node.removeAttribute('x-key');
      }
    }
  };

  const bindEntryNodes = (nodes: Node[], childCtx: BindingContext) => {
    for (const node of nodes) {
      if (node instanceof Element) {
        processDirectives(node, childCtx, { treatRootAsBoundary: true });
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

  const createScopeOverrides = (item: unknown, index: number) => {
    const scopeOverrides: Record<string, unknown> = { [itemName]: item, $index: index };
    if (indexName) scopeOverrides[indexName] = index;
    return scopeOverrides;
  };

  const evaluateKey = (scopeOverrides: Record<string, unknown>) => {
    const keyCtx = createBindingContext({ ...ctx.scope, ...scopeOverrides }, ctx.adapter);
    return evaluateExpr(keyExpr, keyCtx);
  };

  const createEntry = (
    item: unknown,
    index: number,
    scopeOverrides: Record<string, unknown>,
    key: unknown,
    nodesOverride?: Node[]
  ): Entry => {
    const childCtx = createChildContext(ctx, scopeOverrides);
    if (nodesOverride) {
      bindEntryNodes(nodesOverride, childCtx);
      return { key, item, index, ctx: childCtx, nodes: nodesOverride };
    }
    const fragment = template.content.cloneNode(true) as DocumentFragment;
    processDirectives(fragment, childCtx);
    const nodes = Array.from(fragment.childNodes);
    return { key, item, index, ctx: childCtx, nodes };
  };

  const rebindEntry = (entry: Entry, item: unknown, index: number, scopeOverrides: Record<string, unknown>) => {
    disposeEntry(entry, false);
    const nextCtx = createChildContext(ctx, scopeOverrides);
    entry.ctx = nextCtx;
    entry.item = item;
    entry.index = index;
    bindEntryNodes(entry.nodes, nextCtx);
  };

  const hydrateEntries = (items: unknown[]) => {
    if (hydrationAttempted) return;
    hydrationAttempted = true;

    if (!isTemplate) {
      if (!hydrationRoot) {
        ensureAnchor(null);
        return;
      }

      const groups: Node[][] = [];
      let current: Node[] = [];
      let patternIndex = 0;
      let lastNode: ChildNode | null = null;
      let node: ChildNode | null = hydrationRoot;

      while (node) {
        const next: ChildNode | null = node.nextSibling;
        if (isIgnorableText(node)) {
          current.push(node);
          lastNode = node;
          node = next;
          continue;
        }

        const expected = templatePattern[patternIndex];
        if (!expected || !matchesPattern(node, expected)) {
          break;
        }

        current.push(node);
        lastNode = node;
        patternIndex += 1;

        if (patternIndex === templatePattern.length) {
          groups.push(current);
          current = [];
          patternIndex = 0;
        }

        node = next;
      }

      const refNode = lastNode ? lastNode.nextSibling : hydrationRoot.nextSibling;
      const mismatch = templatePattern.length === 0 || patternIndex !== 0 || groups.length !== items.length;

      if (mismatch) {
        for (const nodes of groups) {
          clearForAttrs(nodes);
          markHydratedNodes(nodes);
          for (const node of nodes) {
            node.parentNode?.removeChild(node);
          }
        }
        ensureAnchor(refNode);
        return;
      }

      groups.forEach((nodes, index) => {
        const scopeOverrides = createScopeOverrides(items[index], index);
        const key = evaluateKey(scopeOverrides);
        clearForAttrs(nodes);
        const entry = createEntry(items[index], index, scopeOverrides, key, nodes);
        entries.set(entry.key, entry);
        markHydratedNodes(nodes);
      });

      ensureAnchor(refNode);
      return;
    }

    if (items.length === 0 || templatePattern.length === 0) {
      ensureAnchor(template.nextSibling);
      return;
    }

    const groups: Node[][] = [];
    let current: Node[] = [];
    let patternIndex = 0;
    let entryIndex = 0;
    let lastNode: ChildNode | null = null;
    let node = template.nextSibling;

    while (node && entryIndex < items.length) {
      const next: ChildNode | null = node.nextSibling;
      if (isIgnorableText(node)) {
        current.push(node);
        lastNode = node;
        node = next;
        continue;
      }

      const expected = templatePattern[patternIndex];
      if (!expected || !matchesPattern(node, expected)) {
        ensureAnchor(template.nextSibling);
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
      ensureAnchor(template.nextSibling);
      return;
    }

    groups.forEach((nodes, index) => {
      const scopeOverrides = createScopeOverrides(items[index], index);
      const key = evaluateKey(scopeOverrides);
      const entry = createEntry(items[index], index, scopeOverrides, key, nodes);
      entries.set(entry.key, entry);
      markHydratedNodes(nodes);
    });

    ensureAnchor(lastNode ? lastNode.nextSibling : template.nextSibling);
  };

  const update = (value: unknown) => {
    const items = Array.isArray(value) ? value : [];
    const nextKeys = new Set<unknown>();
    const ordered: Entry[] = [];
    const keyedItems: Array<{
      item: unknown;
      index: number;
      scopeOverrides: Record<string, unknown>;
      key: unknown;
    }> = [];

    items.forEach((item, index) => {
      const scopeOverrides = createScopeOverrides(item, index);
      const key = evaluateKey(scopeOverrides);
      if (nextKeys.has(key)) {
        const keyLabel = typeof key === 'string' ? `"${key}"` : String(key);
        throw new Error(`x-for requires unique keys. Duplicate key ${keyLabel} from x-key="${keyExprSource}".`);
      }
      nextKeys.add(key);
      keyedItems.push({ item, index, scopeOverrides, key });
    });

    hydrateEntries(items);

    keyedItems.forEach(({ item, index, scopeOverrides, key }) => {
      let entry = entries.get(key);

      if (!entry) {
        entry = createEntry(item, index, scopeOverrides, key);
        entries.set(key, entry);
      } else if (entry.item !== item || entry.index !== index) {
        rebindEntry(entry, item, index, scopeOverrides);
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
    const previous = lastOrder;

    if (previous) {
      if (previous.length === nextOrder.length) {
        orderChanged = nextOrder.some((key, index) => key !== previous[index]);
      } else {
        const minLength = Math.min(previous.length, nextOrder.length);
        const prefixSame = previous.slice(0, minLength).every((key, index) => key === nextOrder[index]);

        if (prefixSame && nextOrder.length > previous.length && missingNodes) {
          const appended = ordered.slice(previous.length);
          for (const entry of appended) {
            for (const node of entry.nodes) {
              parent.insertBefore(node, anchor);
            }
          }
          lastOrder = nextOrder;
          return;
        }

        if (prefixSame && nextOrder.length < previous.length && !missingNodes) {
          lastOrder = nextOrder;
          return;
        }
      }
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
