import { atom, type ReadableAtom, type WritableAtom } from "nanostores";
import { nanostores } from "./adapters/nanostores";
import type { ComponentProps } from "./context";
import { createRwc } from "./define";
import { testReactivity, type Store } from "./test-utils";

const { defineComponent: defineWithNano } = createRwc({ adapter: nanostores });
const { defineComponent: defineWithTest } = createRwc({ adapter: testReactivity });

defineWithNano<{
  value: string | null;
  disabled: boolean;
  someStore: WritableAtom<string>;
}>(
  "rwc-props-types",
  (ctx) => {
    const valueAtom: ReadableAtom<string | null> = ctx.props.value;
    const disabledAtom: ReadableAtom<boolean> = ctx.props.disabled;
    const someStoreAtom: WritableAtom<string> = ctx.props.someStore;

    ctx.effect(ctx.props.value, (value) => {
      const inferredValue: string | null = value;
      void inferredValue;
    });

    const $count = atom(1);
    ctx.effect([ctx.props.disabled, ctx.props.someStore, $count] as const, (values) => {
      const disabledFromTuple: boolean = values[0];
      const storeValueFromTuple: string = values[1];
      const countFromTuple: number = values[2];
      void disabledFromTuple;
      void storeValueFromTuple;
      void countFromTuple;
    });

    void valueAtom;
    void disabledAtom;
    void someStoreAtom;
    return {};
  },
  { props: ["value", "disabled", "someStore"] },
);

defineWithTest<{ title: Store<string> }>(
  "rwc-props-types-adapter-store",
  (ctx) => {
    const adapterStore: Store<string> = ctx.props.title;
    ctx.effect(ctx.props.title, (value) => {
      const inferred: string = value;
      void inferred;
    });
    void adapterStore;
    return {};
  },
  { props: ["title"] },
);

defineWithNano<{ value: string | null; disabled: boolean }>(
  "rwc-props-types-runtime",
  (ctx) => {
    const runtimeValue: ReadableAtom<string | null> = ctx.props.value;
    const runtimeDisabled: ReadableAtom<boolean> = ctx.props.disabled;
    void runtimeValue;
    void runtimeDisabled;
    return {};
  },
);

const writable = atom("ready");
const readable = writable as ReadableAtom<string>;
const writableOk: WritableAtom<string> = writable;
const readableOk: ReadableAtom<string> = readable;
type DirectProps = ComponentProps<{ value: string | null; disabled: boolean }, typeof nanostores>;
declare const directValue: DirectProps["value"];
declare const directDisabled: DirectProps["disabled"];
const directValueOk: ReadableAtom<string | null> = directValue;
const directDisabledOk: ReadableAtom<boolean> = directDisabled;
void writableOk;
void readableOk;
void directValueOk;
void directDisabledOk;
