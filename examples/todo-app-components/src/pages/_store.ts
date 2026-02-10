import { atom, computed, type WritableAtom } from "nanostores";

export type Filter = "all" | "active" | "completed";

export type TodoItem = {
  id: number;
  text: string;
  completed: boolean;
};

export type ItemAtom = WritableAtom<TodoItem>;

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

const toItemAtoms = (items: TodoItem[]) => items.map((item) => atom(item));

export function getStores(initialState: InitialData) {
  const $items = atom<ItemAtom[]>(toItemAtoms(initialState.todos));
  const $itemsSnapshot = atom<TodoItem[]>($items.get().map((store) => store.get()));
  const $newTodo = atom("");
  const $filter = atom<Filter>(initialState.filter);

  let itemUnsubs: Array<() => void> = [];

  const syncSnapshot = () => {
    $itemsSnapshot.set($items.get().map((store) => store.get()));
  };

  const resubscribeItems = () => {
    for (const unsub of itemUnsubs) unsub();
    itemUnsubs = [];

    for (const store of $items.get()) {
      itemUnsubs.push(store.subscribe(syncSnapshot));
    }

    syncSnapshot();
  };

  $items.subscribe(resubscribeItems);
  resubscribeItems();

  const $activeTodos = computed($itemsSnapshot, (todos) => todos.filter((todo) => !todo.completed));
  const $completedTodos = computed($itemsSnapshot, (todos) =>
    todos.filter((todo) => todo.completed),
  );
  const $filteredItems = computed([$items, $itemsSnapshot, $filter], (items, snapshot, filter) => {
    if (filter === "active") return items.filter((_, index) => !snapshot[index]?.completed);
    if (filter === "completed") return items.filter((_, index) => snapshot[index]?.completed);
    return items;
  });
  const $canAdd = computed($newTodo, (value) => value.trim().length > 0);
  const $emptyMessage = computed($filter, (filter) => {
    if (filter === "active") return "No active todos.";
    if (filter === "completed") return "No completed todos.";
    return "No todos yet.";
  });

  return {
    $items,
    $itemsSnapshot,
    $newTodo,
    $filter,
    $activeTodos,
    $completedTodos,
    $filteredItems,
    $canAdd,
    $emptyMessage,
  };
}
