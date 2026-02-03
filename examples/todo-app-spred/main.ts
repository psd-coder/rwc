import { defineComponent } from '../../src/index.ts';
import { spred } from '../../src/adapters/spred.ts';
import { signal } from '@spred/core';

type Filter = 'all' | 'active' | 'completed';

defineComponent('todo-app-spred', (ctx) => {
  // State
  const todos = signal([
    { id: 1, text: 'Learn rwc', completed: false },
    { id: 2, text: 'Build something awesome', completed: false },
  ]);

  const newTodo = signal('');
  const filter = signal<Filter>('all');

  ctx.on(ctx.$refs.input, 'keydown', (e) => {
    e.key === 'Enter' && addTodo()
  })

  // Computed
  const activeTodos = signal(get =>
    get(todos).filter(t => !t.completed)
  );

  const completedTodos = signal(get =>
    get(todos).filter(t => t.completed)
  );

  const filteredTodos = signal(get => {
    const f = get(filter);
    const all = get(todos);
    if (f === 'active') return all.filter(t => !t.completed);
    if (f === 'completed') return all.filter(t => t.completed);
    return all;
  });

  const canAdd = signal(get =>
    get(newTodo).trim().length > 0
  );

  const emptyMessage = signal(get => {
    const f = get(filter);
    if (f === 'active') return 'No active todos!';
    if (f === 'completed') return 'No completed todos!';
    return 'No todos yet. Add one above!';
  });

  // Actions
  const onInput = (event: Event) => {
    const target = event.target as HTMLInputElement | null;
    newTodo.set(target?.value ?? '');
  };

  function addTodo() {
    const text = newTodo.value.trim();
    if (!text) return;

    todos.set([
      ...todos.value,
      {
        id: Date.now(),
        text,
        completed: false,
      },
    ]);

    newTodo.set('');
    ctx.$refs.input.focus();
  }

  function toggleTodo(id: number) {
    todos.set(
      todos.value.map(todo =>
        todo.id === id
          ? { ...todo, completed: !todo.completed }
          : todo
      )
    );
  }

  function deleteTodo(id: number) {
    todos.set(todos.value.filter(todo => todo.id !== id));
  }

  function clearCompleted() {
    todos.set(todos.value.filter(todo => !todo.completed));
  }

  function setFilter(next: Filter) {
    filter.set(next);
  }

  return {
    todos,
    newTodo,
    filter,
    activeTodos,
    completedTodos,
    filteredTodos,
    canAdd,
    emptyMessage,
    onInput,
    addTodo,
    toggleTodo,
    deleteTodo,
    clearCompleted,
    setFilter,
  };
}, { adapter: spred });
