import { atom, computed } from "nanostores";

export type Filter = "all" | "active" | "completed";

export type TodoItem = {
  id: number;
  text: string;
  completed: boolean;
};

export type InitialData = {
  todos: TodoItem[];
  filter: Filter;
};

export const DEFAULT_STATE: InitialData = {
  todos: [
    { id: 1, text: "Draft component API", completed: true },
    { id: 2, text: "Build directive tests", completed: false },
  ],
  filter: "all",
};

export function getStores(initialState: InitialData) {
  const $todos = atom<TodoItem[]>(initialState.todos);
  const $newTodo = atom("");
  const $filter = atom<Filter>(initialState.filter);

  const $activeTodos = computed($todos, (todos) => todos.filter((todo) => !todo.completed));
  const $completedTodos = computed($todos, (todos) => todos.filter((todo) => todo.completed));
  const $filteredTodos = computed([$todos, $filter], (todos, filter) => {
    if (filter === "active") return todos.filter((todo) => !todo.completed);
    if (filter === "completed") return todos.filter((todo) => todo.completed);
    return todos;
  });
  const $canAdd = computed($newTodo, (value) => value.trim().length > 0);
  const $emptyMessage = computed($filter, (filter) => {
    if (filter === "active") return "No active todos.";
    if (filter === "completed") return "No completed todos.";
    return "No todos yet.";
  });

  return {
    $todos,
    $newTodo,
    $filter,
    $activeTodos,
    $completedTodos,
    $filteredTodos,
    $canAdd,
    $emptyMessage,
  };
}
