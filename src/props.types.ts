import { defineComponent } from './define';
import { testReactivity, type Store } from './test-utils';

type Item = { id: number };

defineComponent<{ $item: Store<Item>; title: Store<string> }>('rwc-props-types', (ctx) => {
  const itemId: number = ctx.props.$item.value.id;
  const titleValue: string = ctx.props.title.value;
  return { itemId, titleValue };
}, { adapter: testReactivity, props: ['$item', 'title'] });
