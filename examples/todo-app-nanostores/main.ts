import '../../src/style.css';

import { atom, computed } from 'nanostores';
import { defineComponent } from '../../src/index';
import { nanostores } from '../../src/adapters/nanostores';

type Filter = 'all' | 'active' | 'completed';

type TodoItem = {
  id: number;
  text: string;
  completed: boolean;
};

defineComponent('todo-app-nanostores', (ctx) => {
  const $todos = atom<TodoItem[]>([
    { id: 1, text: 'Draft component API', completed: true },
    { id: 2, text: 'Build directive tests', completed: false }
  ]);
  const $newTodo = atom('');
  const $filter = atom<Filter>('all');

  const $activeTodos = computed($todos, (todos) => todos.filter((todo) => !todo.completed));
  const $completedTodos = computed($todos, (todos) => todos.filter((todo) => todo.completed));
  const $filteredTodos = computed([$todos, $filter], (todos, filter) => {
    if (filter === 'active') return todos.filter((todo) => !todo.completed);
    if (filter === 'completed') return todos.filter((todo) => todo.completed);
    return todos;
  });
  const $canAdd = computed($newTodo, (value) => value.trim().length > 0);
  const $emptyMessage = computed($filter, (filter) => {
    if (filter === 'active') return 'No active todos.';
    if (filter === 'completed') return 'No completed todos.';
    return 'No todos yet.';
  });

  const onInput = (event: Event) => {
    const target = event.target as HTMLInputElement | null;
    $newTodo.set(target?.value ?? '');
  };

  const addTodo = () => {
    const text = $newTodo.get().trim();
    if (!text) return;
    $todos.set([...$todos.get(), { id: Date.now(), text, completed: false }]);
    $newTodo.set('');
    ctx.$refs.input?.focus();
  };

  ctx.on(ctx.$refs.input, 'keydown', (event: KeyboardEvent) => {
    if (event.key === 'Enter') {
      addTodo();
    }
  });

  const toggleTodo = (id: number) => {
    $todos.set(
      $todos.get().map((todo) => (todo.id === id ? { ...todo, completed: !todo.completed } : todo))
    );
  };

  const deleteTodo = (id: number) => {
    $todos.set($todos.get().filter((todo) => todo.id !== id));
  };

  const clearCompleted = () => {
    $todos.set($todos.get().filter((todo) => !todo.completed));
  };

  const setFilter = (next: Filter) => {
    $filter.set(next);
  };

  return {
    $todos,
    $newTodo,
    $filter,
    $activeTodos,
    $completedTodos,
    $filteredTodos,
    $canAdd,
    $emptyMessage,
    onInput,
    addTodo,
    toggleTodo,
    deleteTodo,
    clearCompleted,
    setFilter
  };
}, { adapter: nanostores });
