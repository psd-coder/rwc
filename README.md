# RWC

RWC is a small reactive web components library with a directive-based templating model. It is built to be framework-agnostic and works with pluggable reactive adapters (nanostores, @spred/core, or custom).

## Features

- Web components with a tiny setup API
- Directive-driven templates (x-text, x-for, x-if, x-on, etc.)
- Pluggable reactivity adapters
- SSR-friendly: can hydrate existing DOM for x-for
- Avoids redundant DOM writes when values are unchanged (Object.is)

## Quick start

Install dependencies for local development:

```bash
pnpm install
```

Register an adapter and define a component:

```ts
import { defineComponent, registerAdapter } from 'rwc';
import { nanostoresAdapter } from 'rwc/adapters/nanostores';
import { atom } from 'nanostores';

registerAdapter(nanostoresAdapter);

const items = atom([{ id: 1, text: 'Ship it' }]);
const draft = atom('');

defineComponent('todo-app', (ctx) => {
  const add = () => {
    const value = draft.get().trim();
    if (!value) return;
    items.set([...items.get(), { id: Date.now(), text: value }]);
    draft.set('');
    ctx.$refs.input?.focus();
  };

  return { items, draft, add };
});
```

```html
<todo-app>
  <input x-ref="input" x-prop:value="draft" x-on:input="draft.set($event.target.value)" />
  <button x-on:click="add">Add</button>

  <ul>
    <li x-for="item in items" x-key="item.id">
      <span x-text="item.text"></span>
    </li>
  </ul>
</todo-app>
```

## Directives

- `x-text="expr"` - set text content
- `x-html="expr"` - set inner HTML
- `x-if="expr"` - conditionally render; works on `template` or normal elements
- `x-for="item in items"` - list rendering; **requires** `x-key`
- `x-show="expr"` - toggle display
- `x-ref="name"` - register element in `ctx.$refs`
- `x-portal="selector"` - render into another DOM target
- `x-on:event="handler"` - event listener
- `x-attr:name="expr"` - set attributes
- `x-prop:name="expr"` - set properties
- `x-class:name="expr"` or `x-class="expr"` - toggle or set class
- `x-style:name="expr"` - set inline styles
- `x-cloak` - removes itself on init

### x-for + x-key

`x-for` requires `x-key` and uses it to keep DOM nodes stable:

```html
<template x-for="item in items" x-key="item.id">
  <li x-text="item.text"></li>
</template>
```

For non-template usage:

```html
<li x-for="item in items" x-key="item.id">
  <span x-text="item.text"></span>
</li>
```

## SSR + hydration

`x-for` can hydrate server-rendered DOM if the initial markup matches the template:

```html
<ul>
  <template x-for="item in items" x-key="item.id">
    <li x-text="item.text"></li>
  </template>
  <!-- SSR output -->
  <li>Draft component API</li>
  <li>Build directive tests</li>
</ul>
```

If the SSR nodes match the template pattern, RWC adopts them instead of re-rendering. If not, it falls back to client rendering.

## Refs in setup

Static refs (not inside `template`, `x-if`, `x-for`, or `x-portal`) are available during `setup`:

```ts
defineComponent('example', (ctx) => {
  ctx.on(ctx.$refs.input, 'keydown', (event) => {
    if (event.key === 'Enter') {
      // ...
    }
  });
  return {};
});
```

## Reactivity adapters

Adapters implement a minimal interface:

```ts
export interface ReactivityAdapter<T = unknown> {
  isStore(value: unknown): value is T;
  get(store: T): unknown;
  subscribe(store: T, callback: (value: unknown) => void): () => void;
}
```

Built-in adapters:
- `rwc/adapters/nanostores`
- `rwc/adapters/spred`

You can also create a custom adapter and register it with `registerAdapter`.

## Development

```bash
pnpm dev
pnpm test:run
pnpm typecheck
```

Examples live in `examples/todo` and `examples/combobox`.
