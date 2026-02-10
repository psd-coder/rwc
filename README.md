# RWC — Reactive Web Components

RWC is a small reactive web components library with a directive-based templating model. It is built to be framework-agnostic and works with pluggable reactive adapters (nanostores, @spred/core, or custom).

## Features

- Web components with a minimal setup API (`createRwc` + `defineComponent`)
- Directive-driven templates (`x-text`, `x-for`, `x-if`, `x-on`, etc.)
- Pluggable reactivity adapters (nanostores, spred, or custom)
- SSR-friendly: `x-for` can hydrate server-rendered lists
- Skips redundant DOM writes via `Object.is` equality checks

## Quick start

```bash
pnpm install
```

Define a component:

```ts
import { createRwc } from "rwc";
import { nanostores } from "rwc/adapters/nanostores";
import { atom } from "nanostores";

const $items = atom([{ id: 1, text: "Ship it" }]);
const $draft = atom("");
const { defineComponent } = createRwc({ adapter: nanostores });

defineComponent("todo-app", (ctx) => {
  const add = () => {
    const value = $draft.get().trim();
    if (!value) return;
    $items.set([...$items.get(), { id: Date.now(), text: value }]);
    $draft.set("");
    ctx.refs.input?.focus();
  };

  return { $items, $draft, add };
});
```

Wire it up in HTML:

```html
<todo-app>
  <input x-ref="input" x-prop:value="$draft" x-on:input="$draft.set($event.target.value)" />
  <button x-on:click="add">Add</button>

  <ul>
    <template x-for="item in $items" x-key="item.id">
      <li x-text="item.text"></li>
    </template>
  </ul>
</todo-app>
```

`setup` receives a context object and must return a plain object. Every key in that object becomes part of the expression scope — accessible from any directive inside the component.

## Context API

| Property / method                           | Description                                                                                                                  |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `ctx.host`                                  | The component's host element                                                                                                 |
| `ctx.refs`                                  | Static element references collected before `setup` runs — see [x-ref](#x-ref)                                                |
| `ctx.props`                                 | Reactive prop stores inferred from `x-prop:*` bindings (plus optional declared `props`)                                      |
| `ctx.on(target, event, listener, options?)` | Adds an event listener with automatic cleanup on disconnect. `target` can be a single `EventTarget` or an array              |
| `ctx.effect(store, cb)`                     | Subscribes to a single store. `cb` is called immediately with the current value and on every subsequent change               |
| `ctx.effect([stores], cb)`                  | Subscribes to multiple stores. `cb` receives an array of all current values, called initially and whenever any store changes |
| `ctx.dispatch(name, detail?, options?)`     | Emits a `CustomEvent` on `ctx.host`. Defaults to `bubbles: true, cancelable: true`                                           |
| `ctx.getElement(selector)`                  | Returns the first matching descendant. Throws if nothing matches                                                             |
| `ctx.getElements(selector)`                 | Returns all matching descendants (empty array if none)                                                                       |
| `ctx.registerCleanup(fn)`                   | Registers a function to run when the component disconnects                                                                   |

## Cleanup lifecycle

RWC cleans up most reactive resources automatically when a component
disconnects:

- listeners registered with `ctx.on(...)`
- subscriptions created by `ctx.effect(...)`
- directive bindings (`x-*`) and their internal subscriptions/listeners
- dynamic refs created inside structural directives (`x-if`, `x-for`,
  `x-portal`)

Use `ctx.registerCleanup(...)` for userland side effects that RWC does not
own, for example timers, observers, external subscriptions, or custom DOM
listeners.

```ts
defineComponent("my-comp", (ctx) => {
  const timer = window.setInterval(() => {
    // ...
  }, 1000);

  const observer = new MutationObserver(() => {
    // ...
  });
  observer.observe(ctx.host, { childList: true, subtree: true });

  ctx.registerCleanup(() => {
    window.clearInterval(timer);
    observer.disconnect();
  });

  return {};
});
```

## defineComponent options

```ts
const { defineComponent } = createRwc({ adapter });
defineComponent("my-comp", setup, { props: ["title"] });
```

| Option  | Description                                                                              |
| ------- | ---------------------------------------------------------------------------------------- |
| `props` | Optional list of prop names to predeclare in `ctx.props` before `x-prop:*` is discovered |

## Component composition

Custom elements are directive boundaries. When a parent processes directives, it only runs directives on the custom element itself (like `x-prop`) and skips its children. The child component owns its own subtree and scope.

Props are passed via `x-prop` and read from `ctx.props` in the child:

```html
<todo-item x-prop:$item="$item"></todo-item>
```

```ts
import { createRwc } from "rwc";
import { nanostores } from "rwc/adapters/nanostores";

const { defineComponent } = createRwc({ adapter: nanostores });

defineComponent<{ $item: ItemAtom }>(
  "todo-item",
  (ctx) => {
    const $item = ctx.props.$item;
    return { $item };
  },
  { props: ["$item"] },
);
```

`ctx.props` is ready before `setup` runs (after static refs are collected), so props are always available inside `setup`. Store-shaped props pass through as-is; plain values are wrapped with adapter-created stores.

## Directives

### x-text

Sets `textContent`. `null`/`undefined` render as empty string.

```html
<span x-text="item.name"></span> <span x-text="count * 2"></span>
```

### x-html

Sets `innerHTML`. `null`/`undefined` render as empty string. Only use with trusted content.

```html
<div x-html="markupString"></div>
```

### x-if

Conditionally mounts or unmounts a block. Works on `<template>` (can have multiple root nodes) or a single element. Child subscriptions and refs are fully disposed on unmount and re-created on re-mount. Nesting is supported.

```html
<template x-if="isLoggedIn">
  <span x-text="userName"></span>
</template>

<!-- single-element shorthand -->
<p x-if="showNote">A note</p>
```

When used on a plain element, every other directive on that element (`x-text`, `x-attr`, `x-on`, `x-class`, etc.) is processed on each mount and fully disposed on unmount. A fresh clone is made from the original element on every re-mount, so static attributes like `class` are restored automatically:

```html
<span x-if="show" x-text="name" x-class:highlight="isHighlighted"></span>
<button x-if="show" x-on:click="save" x-attr:disabled="isSaving">Save</button>
```

### x-for

Renders a list with keyed reconciliation. `x-key` is required; it keeps existing DOM nodes stable when the list is reordered.

```html
<template x-for="item in items" x-key="item.id">
  <li x-text="item.text"></li>
</template>
```

**Index binding** — use `(item, index)` to name the index. `$index` is also always available without the explicit alias:

```html
<template x-for="(item, i) in items" x-key="item.id">
  <li x-text="i + ': ' + item.text"></li>
</template>
```

Additional details:

- Non-array values are silently treated as an empty list.
- Duplicate keys throw at runtime.
- Templates may contain multiple root nodes per iteration.
- `x-for` must be placed on a `<template>`.

### x-show

Toggles `display: none` without mounting/unmounting — the DOM node stays alive. The original `style.display` value is captured once at init and restored whenever the expression is truthy.

```html
<div x-show="isVisible">Always in the DOM</div>
```

If the element already has `style="display: none"` at init time, `x-show` treats it as an SSR-hidden state and restores the default display when the expression becomes truthy.

**SSR visibility hints** — to avoid a flash of hidden/empty state before hydration, add server-evaluated SSR attributes and a CSS rule:

```css
[x-show-ssr="false"],
[x-if-ssr="false"],
[x-portal] {
  display: none !important;
}
```

```html
<div x-show="isVisible" x-show-ssr="false">...</div>
<div x-if="isOpen" x-if-ssr="false">...</div>
```

When the expression becomes truthy, RWC removes the `x-show-ssr`/`x-if-ssr` attribute so the element can show. For `x-if`, the element is still mounted/unmounted as usual; the marker just controls pre-hydration visibility.

### Styles

RWC ships a small stylesheet with the defaults for `x-cloak`, `x-show-ssr`, `x-if-ssr`, and `x-portal`:

```ts
import "rwc/style.css";
```

If you prefer, you can copy the rules into your own stylesheet instead.

### x-ref

Registers an element in `ctx.refs`.

**Static refs** — elements _not_ inside `x-if`, `x-for`, `x-portal`, or `<template>` — are collected before `setup` runs, so they are available immediately as `ctx.refs`:

```html
<input x-ref="email" />
```

**Dynamic refs** — elements inside conditional or loop directives — are added to `ctx.refs` when the containing block mounts and removed when it unmounts. They share the same refs object.

### x-portal

Renders content into a different part of the DOM identified by a CSS selector. Content is removed when the component disconnects.

```html
<template x-portal="#modal-root">
  <div class="modal">Modal content</div>
</template>
```

Combine with `x-if` on the same element for a conditional portal:

```html
<template x-portal="#modal-root" x-if="isOpen">
  <div class="modal">...</div>
</template>
```

### x-on

Attaches an event listener.

```html
<button x-on:click="increment()">+</button>
```

**Modifiers** (chainable in any order):

| Modifier   | Effect                          |
| ---------- | ------------------------------- |
| `.prevent` | calls `event.preventDefault()`  |
| `.stop`    | calls `event.stopPropagation()` |
| `.once`    | listener fires at most once     |
| `.capture` | uses the capture phase          |

```html
<a x-on:click.prevent.stop="navigate(url)">Link</a>
```

**Special variables** available inside the expression:

| Variable | Value                                   |
| -------- | --------------------------------------- |
| `$event` | the native `Event` object               |
| `$el`    | the element the listener is attached to |

If the expression is a bare identifier that resolves to a function (e.g. `x-on:click="handler"`), it is called with the event as the first argument and the scope as `this`. If it resolves to a non-function value, nothing happens.

### x-attr

Sets or removes an HTML attribute.

```html
<button x-attr:disabled="isDisabled"></button>
```

| Value                          | Behaviour                                                              |
| ------------------------------ | ---------------------------------------------------------------------- |
| `true`                         | sets the attribute to `""` (correct for boolean attrs like `disabled`) |
| `false` / `null` / `undefined` | removes the attribute                                                  |
| anything else                  | coerced to string                                                      |

### x-prop

Sets an element **property** directly (not an attribute). The value is assigned as-is — no coercion.

```html
<input x-prop:value="text" /> <input type="checkbox" x-prop:checked="done" />
```

On custom elements, store-valued props are passed through without unwrapping. Plain values are wrapped in an internal adapter store so updates propagate reactively. `ctx.props` is populated from `x-prop:*` names automatically; `defineComponent(..., { props })` is optional and only predeclares names.

### x-bind

Two-way property binding. `x-bind` writes the current value to the element property and writes user changes back.

```html
<input x-bind:value="title" /> <input type="checkbox" x-bind:checked="done" />
```

Shorthand form expects the expression to resolve to a writable store target (for example, an object with `set(value)`).

For custom setter logic, use object syntax with both `get` and `set`:

```html
<input x-bind:value="{ get: title + '!', set: setTitle }" />
<input x-bind:value="{ get: title, set: setTitle($value, $event) }" />
```

Setter specials:

| Variable | Value                          |
| -------- | ------------------------------ |
| `$value` | current element property value |
| `$event` | native event instance          |
| `$el`    | bound element                  |

Default event is `input`, except:

- `x-bind:checked` uses `change`
- `<select x-bind:...>` uses `change`
- checkbox/radio/file inputs use `change`

You can override the event with one modifier:

```html
<input x-bind:value.change="title" />
```

### x-class

Two forms:

**Toggle a single class:**

```html
<span x-class:active="isActive"></span>
```

**Merge dynamic classes with existing static classes**:

```html
<div class="btn" x-class="{ primary: isPrimary, lg: size === 'lg' }"></div>
<div x-class="['card', size]"></div>
```

Supported values are `string`, `object`, or a one-level `array` of strings/objects. Falsy values are filtered. For object syntax, falsy keys remove matching static classes from the base class list.

### x-style

Sets inline styles. Supports both a single property (`x-style:color`) and object bindings (`x-style="{ ... }"`). Kebab-case names and CSS custom properties are supported.

```html
<div x-style:color="textColor"></div>
<div x-style:background-color="bg"></div>
<div x-style:--accent="brandColor"></div>
<div x-style="{ display: isHidden ? 'none' : 'block', backgroundColor: bg }"></div>
```

`false` or `null` removes the property.

### x-cloak

Removes itself after the component initialises. Use alongside a CSS rule to prevent a flash of un-rendered template:

```css
[x-cloak] {
  display: none;
}
```

```html
<div x-cloak>
  <span x-text="name"></span>
</div>
```

You can also import the bundled stylesheet instead of defining your own rule.

## Expressions

Directive values are parsed and evaluated as expressions. Supported syntax:

| Category              | Examples                                                    |
| --------------------- | ----------------------------------------------------------- |
| Literals              | `42`, `3.14`, `"hello"`, `'world'`, `true`, `false`, `null` |
| Identifiers           | `count`, `$refs`, `$props`, `item`                          |
| Member / index access | `user.name`, `items[0]`, `map[key]`                         |
| Calls                 | `fn()`, `obj.method(arg)`, `arr[0]()`                       |
| Arithmetic            | `a + b`, `a - b`, `a * b`, `a / b`                          |
| Comparison            | `a === b`, `a !== b`, `a < b`, `a <= b`, `a > b`, `a >= b`  |
| Logical               | `a && b`, `a \|\| b` — both short-circuit                   |
| Unary                 | `!flag`, `-count`, `+str`                                   |
| Ternary               | `cond ? a : b`                                              |
| Array literal         | `[a, b, c]`                                                 |
| Object literal        | `{ key: value, other: expr }`                               |

`+` works for string concatenation as well as addition.

`$props` is available in expressions and reads prop values reactively (for example: `x-text="$props.title"`).

## SSR + hydration

`x-for` can adopt server-rendered sibling nodes instead of re-rendering from scratch. On first render, if the DOM nodes immediately following a `<template x-for>` match the template's structure (same tag names in the same order, one group per list item), RWC binds directives directly to those existing nodes.

```html
<ul>
  <template x-for="item in items" x-key="item.id">
    <li x-text="item.text"></li>
  </template>
  <!-- server-rendered output that matches the template pattern: -->
  <li>Draft component API</li>
  <li>Build directive tests</li>
</ul>
```

If the pattern does not match (different tags, wrong number of nodes, etc.) it falls back to normal client-side rendering.

## Reactivity adapters

Every adapter implements five methods:

```ts
interface ReactivityAdapter<T = unknown> {
  isStore(value: unknown): value is T;
  create<TValue>(initial: TValue): unknown;
  get(store: T): unknown;
  set<TValue>(store: unknown, value: TValue): void;
  subscribe(store: T, callback: (value: unknown) => void): () => void;
}
```

| Adapter    | Import path               | Store detection           |
| ---------- | ------------------------- | ------------------------- |
| nanostores | `rwc/adapters/nanostores` | `.get()` + `.subscribe()` |
| spred      | `rwc/adapters/spred`      | `.value` + `.subscribe()` |

Create a scoped `defineComponent` once per module:

```ts
import { createRwc } from "rwc";
import { nanostores } from "rwc/adapters/nanostores";
const { defineComponent } = createRwc({ adapter: nanostores });
defineComponent("my-comp", setup);
```

A custom adapter can be created by implementing the five-method interface above. `create`/`set` are used for framework-managed writable stores (for example, wrapped plain props and `x-bind` writes).

## Examples

| Example                          | Adapter    | Highlights                                                               |
| -------------------------------- | ---------- | ------------------------------------------------------------------------ |
| `examples/todo-app-spred`        | spred      | Core directives, two-way binding, computed values                        |
| `examples/todo-app-nanostores`   | nanostores | Same app with a different adapter — demonstrates adapter-agnostic design |
| `examples/todo-app-components`   | nanostores | Astro demo for nested components and prop stores                         |
| `examples/combobox`              | —          | `x-portal`, Floating UI integration, dynamic positioning                 |
| `examples/astro-nanostores-todo` | nanostores | SSR with Astro, hydration, `data-initial` seeding                        |

Each example has its own `package.json`. Run any of them with:

```bash
cd examples/<name>
pnpm install
pnpm dev
```

## Development

```bash
pnpm install        # install dependencies
pnpm lint           # run oxlint
pnpm lint:fix       # apply auto-fixes where available
pnpm format         # run oxfmt and write changes
pnpm format:check   # check formatting without writing
pnpm test:run       # run tests (single pass)
pnpm typecheck      # tsc --noEmit
```
