import { defineComponent } from './define';
import type { AdapterStoreValue, ReactivityAdapter, StoreValueTemplate } from './adapters/types';
import { createStore, testReactivity, type Store } from './test-utils';

type Item = { id: number };
type Refs = {
  title: HTMLHeadingElement;
  button?: HTMLButtonElement;
};
type NanostoreLike<T> = {
  readonly value: T | undefined;
  get(): T;
  subscribe(listener: (value: T) => void): () => void;
};
interface NanostoreLikeValueTemplate extends StoreValueTemplate {
  readonly value: this['store'] extends NanostoreLike<infer TValue> ? TValue : unknown;
}
const nanostoreAdapter: ReactivityAdapter<NanostoreLike<unknown>, NanostoreLikeValueTemplate> = {
  isStore(value: unknown): value is NanostoreLike<unknown> {
    return !!value && typeof value === 'object' && 'get' in value && 'subscribe' in value;
  },
  get<T>(store: NanostoreLike<T>) {
    return store.get();
  },
  subscribe<T>(store: NanostoreLike<T>, callback: (value: T) => void) {
    return store.subscribe(callback);
  }
};

defineComponent<{ $item: Store<Item>; title: Store<string> }, Refs>('rwc-props-types', (ctx) => {
  const itemId: number = ctx.props.$item.value.id;
  const titleValue: string = ctx.props.title.value;
  const titleRef: HTMLHeadingElement = ctx.$refs.title;
  const buttonRef: HTMLButtonElement | undefined = ctx.$refs.button;
  ctx.effect(ctx.props.title, (value) => {
    const titleFromEffect: string = value;
    void titleFromEffect;
  });
  const $count = createStore(1);
  ctx.effect([ctx.props.title, $count] as const, (values) => {
    const titleFromTuple: string = values[0];
    const countFromTuple: number = values[1];
    void titleFromTuple;
    void countFromTuple;
  });
  void titleRef;
  void buttonRef;
  return { itemId, titleValue };
}, { adapter: testReactivity, props: ['$item', 'title'] });

defineComponent<{ title: NanostoreLike<string> }>(
  'rwc-props-types-nanostores',
  (ctx) => {
    ctx.effect(ctx.props.title, (value) => {
      const inferred: string = value;
      void inferred;
    });
    return {};
  },
  { adapter: nanostoreAdapter, props: ['title'] }
);

declare const nanostoreValue: AdapterStoreValue<typeof nanostoreAdapter, NanostoreLike<string>>;
const stringValue: string = nanostoreValue;
void stringValue;
