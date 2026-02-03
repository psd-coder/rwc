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

const $items = atom([{ id: 1, text: 'Ship it' }]);
const $draft = atom('');

defineComponent('todo-app', (ctx) => {
  const add = () => {
    const value = $draft.get().trim();
    if (!value) return;
   $items.set([...$items.get(), { id: Date.now(), text: value }]);
    $draft.set('');
    ctx.$refs.input?.focus();
  };

  return { $items, $draft, add };
});
```

```html
<todo-app>
  <input x-ref="input" x-prop:value="$draft" x-on:input="$draft.set($event.target.value)" />
  <button x-on:click="add">Add</button>

  <ul>
    <li x-for="item in $items" x-key="item.id">
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

## Examples

This directory contains example applications demonstrating various features of RWC (Reactive Web Components).

### 1. Todo App (Spred) (`examples/todo-app-spred/`)

A classic todo application demonstrating:
- Component state management with signals
- Computed values (filtered lists, counts)
- Event handling (add, toggle, delete)
- Conditional rendering (`x-if`)
- List rendering (`x-for`)
- Two-way binding (`x-prop`, `x-on:input`)
- Class bindings (`x-class`)
- Element references (`x-ref`)
- **Uses @spred/core for reactivity**

**Run it:**
```bash
cd examples/todo-app-spred
pnpm install
pnpm dev
```

Then open http://localhost:5173

### 1b. Todo App - Nanostores (`examples/todo-app-nanostores/`)

The same todo application but using nanostores instead of @spred/core.

Demonstrates:
- Adapter-agnostic design
- Using `atom` and `computed` from nanostores
- Identical functionality with a different reactivity library
- Pink color scheme to differentiate from the spred version

**Run it:**
```bash
cd examples/todo-app-nanostores
pnpm install
pnpm dev
```

Then open http://localhost:5173

**Compare** the two versions to see how RWC works with different reactivity systems.

### 2. Combobox with Floating UI (`examples/combobox/`)

A searchable country selector with a floating dropdown, demonstrating:
- Integration with external libraries (Floating UI)
- Portal directive (`x-portal`) to render the dropdown in `body`
- Dynamic positioning with `x-style` and `x-attr`
- Event-driven open/close logic and selection state
- List rendering (`x-for`) and conditional rendering (`x-if`, `x-show`)

**Dependencies:**
This example requires `@floating-ui/dom`. Install it:
```bash
cd examples/combobox
pnpm add @floating-ui/dom
```

**Run it:**
```bash
cd examples/combobox
pnpm install
pnpm dev
```

Then open http://localhost:5173

### 3. Astro Todo App (Nanostores) (`examples/astro-nanostores-todo/`)

An Astro page that renders the todo UI server-side and enhances it with RWC + nanostores on the client.

Demonstrates:
- Using RWC directives inside `.astro` templates
- Seeding client state via `data-initial`
- Adapter usage with nanostores inside Astro

**Run it:**
```bash
cd examples/astro-nanostores-todo
pnpm install
pnpm dev
```

Then open the local URL shown by Astro (usually http://localhost:4321).

## Running Examples with Vite

The Vite-based examples live in `examples/todo-app-spred`, `examples/todo-app-nanostores`, and `examples/combobox`.

1. Make sure you have the dependencies installed in the example directory:
   ```bash
   pnpm install
   ```

2. Start the dev server:
   ```bash
   pnpm dev
   ```

3. Open the URL shown in the terminal (usually http://localhost:5173).

## Key Concepts Demonstrated

### Reactive State (Spred)
```ts
const count = signal(0);
const doubled = signal(get => get(count) * 2);
```

### Reactive State (Nanostores)
```ts
const $count = atom(0);
const $doubled = computed($count, (count) => count * 2);
```

### Event Handling
```html
<button x-on:click="increment()">+</button>
<input x-on:input="$value.set($event.target.value)">
```

### Conditional Rendering
```html
<div x-if="visible">Only shown when visible is true</div>
```

### List Rendering
```html
<li x-for="item in items" x-key="item.id" x-text="item.name"></li>
```

### Portal
```html
<div x-portal="body" class="modal">Rendered at end of body</div>
```

### Component Context
```ts
defineComponent('my-component', (ctx) => {
  // ctx.host - the component element
  // ctx.$refs - element references
  // ctx.dispatch - emit custom events
  // ctx.on - event listeners with auto-cleanup
  // ctx.registerCleanup - cleanup on disconnect
});
```

## Learn More

- Browse `examples/` for hands-on usage
- Read `src/` to see the implementation details

## Development

```bash
pnpm dev
pnpm test:run
pnpm typecheck
```
