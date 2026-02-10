import { describe, expect, it } from "vitest";
import { parse } from "./parser";
import { evaluate } from "./evaluator";

describe("expression evaluator", () => {
  it("evaluates literals and identifiers", () => {
    const scope = { count: 42, name: "test" };
    expect(evaluate(parse("true"), scope)).toBe(true);
    expect(evaluate(parse("false"), scope)).toBe(false);
    expect(evaluate(parse("null"), scope)).toBeNull();
    expect(evaluate(parse("count"), scope)).toBe(42);
    expect(evaluate(parse("name"), scope)).toBe("test");
  });

  it("evaluates binary operators with precedence", () => {
    const expr = parse("1 + 2 * 3");
    expect(evaluate(expr, {})).toBe(7);
  });

  it("evaluates member and index access", () => {
    const scope = { user: { name: "Ada" }, items: ["a", "b"] };
    expect(evaluate(parse("user.name"), scope)).toBe("Ada");
    expect(evaluate(parse("items[1]"), scope)).toBe("b");
    expect(evaluate(parse("items[index]"), { ...scope, index: 0 })).toBe("a");
  });

  it("evaluates unary operators", () => {
    const scope = { count: 10, active: false };
    expect(evaluate(parse("!active"), scope)).toBe(true);
    expect(evaluate(parse("-count"), scope)).toBe(-10);
    expect(evaluate(parse("+count"), scope)).toBe(10);
  });

  it("evaluates comparison and equality operators", () => {
    expect(evaluate(parse("5 === 5"), {})).toBe(true);
    expect(evaluate(parse("5 !== 6"), {})).toBe(true);
    expect(evaluate(parse("5 < 10"), {})).toBe(true);
    expect(evaluate(parse("5 <= 5"), {})).toBe(true);
    expect(evaluate(parse("10 > 5"), {})).toBe(true);
    expect(evaluate(parse("10 >= 10"), {})).toBe(true);
  });

  it("short-circuits logical operators", () => {
    const scope = {
      boom: () => {
        throw new Error("boom");
      },
    };
    expect(evaluate(parse("false && boom()"), scope)).toBe(false);
    expect(evaluate(parse("true || boom()"), scope)).toBe(true);
  });

  it("evaluates ternary expressions", () => {
    const scope = { ready: false, yes: "yes", no: "no" };
    expect(evaluate(parse("ready ? yes : no"), scope)).toBe("no");
  });

  it("calls functions and preserves this for members", () => {
    const scope = {
      ping: () => 5,
      sum: (a: number, b: number) => a + b,
      counter: {
        value: 2,
        inc() {
          return this.value + 1;
        },
      },
    };

    expect(evaluate(parse("ping()"), scope)).toBe(5);
    expect(evaluate(parse("sum(1, 2)"), scope)).toBe(3);
    expect(evaluate(parse("counter.inc()"), scope)).toBe(3);
  });

  it("evaluates array and object literals", () => {
    const scope = { foo: "bar" };
    expect(evaluate(parse("[1, foo]"), scope)).toEqual([1, "bar"]);
    expect(evaluate(parse("{ a: 1, b: foo }"), scope)).toEqual({ a: 1, b: "bar" });
  });

  it("supports special variables and custom value resolution", () => {
    const store = { value: 5 };
    const resolve = (value: unknown) =>
      value && typeof value === "object" && "value" in value
        ? (value as { value: number }).value
        : value;

    const specials = { $event: { detail: 9 } };
    expect(evaluate(parse("$event.detail"), {}, specials)).toBe(9);
    expect(evaluate(parse("$index"), {}, { $index: 3 })).toBe(3);
    expect(evaluate(parse("count + 1"), { count: store }, {}, resolve)).toBe(6);
  });

  it("passes special variables to function calls", () => {
    const handler = (event: { type: string }) => event.type;
    const specials = { $event: { type: "click" } };
    expect(evaluate(parse("handler($event)"), { handler }, specials)).toBe("click");
  });

  it("prefers store methods on call targets before unwrapping values", () => {
    const add = function (this: { items: string[] }, item: string) {
      this.items = [...this.items, item];
    };
    const listValue = { items: ["a"], add };
    const store = {
      value: listValue,
      set(next: typeof listValue) {
        this.value = next;
      },
    };
    const isStore = (value: unknown): value is typeof store =>
      !!value && typeof value === "object" && "value" in value && "set" in value;
    const resolve = (value: unknown) => (isStore(value) ? value.value : value);

    evaluate(
      parse('list.set({ items: ["b"], add: add })'),
      { list: store, add },
      {},
      resolve,
      isStore,
    );
    expect(store.value.items).toEqual(["b"]);

    evaluate(parse('list.add("c")'), { list: store }, {}, resolve, isStore);
    expect(store.value.items).toEqual(["b", "c"]);
  });

  it("allows calling store prototype methods on call targets", () => {
    class Store {
      value = 1;
      set(next: number) {
        this.value = next;
      }
      subscribe() {
        return () => {};
      }
    }
    const store = new Store();
    const isStore = (value: unknown): value is Store =>
      !!value && typeof value === "object" && "value" in value && "subscribe" in value;
    const resolve = (value: unknown) => (isStore(value) ? value.value : value);

    evaluate(parse("store.set(5)"), { store }, {}, resolve, isStore);
    expect(store.value).toBe(5);
  });

  it("returns undefined for property access on null and undefined", () => {
    expect(evaluate(parse("x.foo"), { x: null })).toBeUndefined();
    expect(evaluate(parse("x.foo"), { x: undefined })).toBeUndefined();
    expect(evaluate(parse("x[0]"), { x: null })).toBeUndefined();
  });

  it("returns undefined for identifiers not in scope", () => {
    expect(evaluate(parse("missing"), {})).toBeUndefined();
  });

  it("concatenates strings with the + operator", () => {
    expect(evaluate(parse('"hello" + " " + "world"'), {})).toBe("hello world");
    expect(evaluate(parse('x + "!"'), { x: "hi" })).toBe("hi!");
  });

  it("supports index-based method calls", () => {
    const scope = { fns: [() => "first", () => "second"] };
    expect(evaluate(parse("fns[0]()"), scope)).toBe("first");
    expect(evaluate(parse("fns[1]()"), scope)).toBe("second");
  });

  it("returns Infinity for division by zero", () => {
    expect(evaluate(parse("1 / 0"), {})).toBe(Infinity);
    expect(evaluate(parse("-1 / 0"), {})).toBe(-Infinity);
  });

  it("allows prototype method calls but blocks dangerous keys", () => {
    class Demo {
      get value() {
        return 3;
      }
      method() {
        return 4;
      }
    }
    const scope = { list: ["a", "b"], demo: new Demo() };
    expect(evaluate(parse("list.length"), scope)).toBe(2);
    expect(evaluate(parse("demo.value"), scope)).toBe(3);
    expect(evaluate(parse("list.map"), scope)).toBeUndefined();
    expect(evaluate(parse("demo.method"), scope)).toBeUndefined();
    expect(evaluate(parse("({}).toString"), {})).toBeUndefined();
    expect(evaluate(parse('list.push("c")'), scope)).toBe(3);
    expect(scope.list).toEqual(["a", "b", "c"]);
    expect(evaluate(parse("demo.method()"), scope)).toBe(4);
    expect(() => evaluate(parse("({}).constructor()"), {})).toThrow(
      "Call target is not a function",
    );
    expect(() => evaluate(parse("({}).__proto__()"), {})).toThrow("Call target is not a function");
  });
});
