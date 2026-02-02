import type { ReactivityAdapter } from './types';

let globalAdapter: ReactivityAdapter | null = null;

export function registerAdapter(adapter: ReactivityAdapter, options?: { replace?: boolean }) {
  if (globalAdapter && !options?.replace) {
    throw new Error('Adapter already registered');
  }
  globalAdapter = adapter;
}

export function getAdapter(): ReactivityAdapter {
  if (!globalAdapter) {
    throw new Error('No adapter registered');
  }
  return globalAdapter;
}

export function resetAdapterForTests() {
  globalAdapter = null;
}
