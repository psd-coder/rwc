import { isReactiveStore, readReactiveStoreValue } from "../stores";
import type { ReactivityAdapter } from "../adapters/types";

export const expressionPropsStoresSymbol = Symbol("rwc.expressionPropsStores");

export function createExpressionProps(
  props: Record<string, unknown>,
  adapter: ReactivityAdapter,
): Record<string, unknown> {
  return new Proxy(props, {
    get(target, key, receiver) {
      if (key === expressionPropsStoresSymbol) {
        return target;
      }
      const value = Reflect.get(target, key, receiver);
      return isReactiveStore(value, adapter) ? readReactiveStoreValue(value, adapter) : value;
    },
  });
}
