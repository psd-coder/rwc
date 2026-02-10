import { createRwc } from "./define";
import { testReactivity } from "./test-utils";

export const { defineComponent } = createRwc({ adapter: testReactivity });
