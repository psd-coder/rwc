import { defineComponent, registerAdapter } from '../../src/index';
import { localAdapter, signal } from '../shared/store';

registerAdapter(localAdapter, { replace: true });

type TodoItem = {
  id: number;
  text: string;
  done: boolean;
};

defineComponent('todo-app', (ctx) => {
  const items = signal<TodoItem[]>([
    { id: 1, text: 'Draft component API', done: true },
    { id: 2, text: 'Build directive tests', done: false }
  ]);
  const draft = signal('');

  const setItems = (next: TodoItem[]) => items.set(next);

  const onInput = (event: Event) => {
    const target = event.target as HTMLInputElement | null;
    draft.set(target?.value ?? '');
  };

  const add = () => {
    const text = draft.value.trim();
    if (!text) return;
    setItems([...items.value, { id: Date.now(), text, done: false }]);
    draft.set('');
    ctx.$refs.input?.focus();
  };

  const toggle = (item: TodoItem) => {
    setItems(
      items.value.map((current) =>
        current.id === item.id ? { ...current, done: !current.done } : current
      )
    );
  };

  const remove = (item: TodoItem) => {
    setItems(items.value.filter((current) => current.id !== item.id));
  };

  return { items, draft, onInput, add, toggle, remove };
});
