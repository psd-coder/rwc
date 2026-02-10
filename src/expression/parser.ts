import type { Expr, BinaryOp, UnaryOp } from "./types";
import { tokenize, type Token } from "./tokenizer";

const BINARY_LEVELS: BinaryOp[][] = [
  ["||"],
  ["&&"],
  ["===", "!=="],
  ["<", "<=", ">", ">="],
  ["+", "-"],
  ["*", "/"],
];

export function parse(input: string): Expr {
  const tokens = tokenize(input);
  const parser = new Parser(tokens);
  const expr = parser.parseExpression();
  parser.expectEnd();
  return expr;
}

class Parser {
  private index = 0;

  constructor(private readonly tokens: Token[]) {}

  parseExpression(): Expr {
    return this.parseTernary();
  }

  expectEnd() {
    this.expect("eof");
  }

  private parseTernary(): Expr {
    const test = this.parseBinaryLevel(0);
    if (this.matchOp("?")) {
      const consequent = this.parseExpression();
      this.expectOp(":");
      const alternate = this.parseExpression();
      return { type: "ternary", test, consequent, alternate };
    }
    return test;
  }

  private parseBinaryLevel(level: number): Expr {
    if (level >= BINARY_LEVELS.length) {
      return this.parseUnary();
    }
    const ops = BINARY_LEVELS[level];
    let left = this.parseBinaryLevel(level + 1);
    while (this.peekOpIn(ops)) {
      const op = this.consume().value as BinaryOp;
      const right = this.parseBinaryLevel(level + 1);
      left = { type: "binary", op, left, right };
    }
    return left;
  }

  private parseUnary(): Expr {
    if (this.peekOpIn(["!", "-", "+"])) {
      const op = this.consume().value as UnaryOp;
      const arg = this.parseUnary();
      return { type: "unary", op, arg };
    }
    return this.parseCall();
  }

  private parseCall(): Expr {
    let expr = this.parseMember();
    while (this.matchOp("(")) {
      const args: Expr[] = [];
      if (!this.peekOp(")")) {
        do {
          args.push(this.parseExpression());
        } while (this.matchOp(","));
      }
      this.expectOp(")");
      expr = { type: "call", callee: expr, args };
    }
    return expr;
  }

  private parseMember(): Expr {
    let expr = this.parsePrimary();
    while (true) {
      if (this.matchOp(".")) {
        const ident = this.consume();
        if (ident.type !== "ident") {
          throw this.error(`Expected identifier after "."`, ident.pos);
        }
        expr = { type: "member", object: expr, property: ident.value as string };
        continue;
      }
      if (this.matchOp("[")) {
        const index = this.parseExpression();
        this.expectOp("]");
        expr = { type: "index", object: expr, index };
        continue;
      }
      break;
    }
    return expr;
  }

  private parsePrimary(): Expr {
    const token = this.consume();
    if (token.type === "number" || token.type === "string") {
      return { type: "literal", value: token.value };
    }
    if (token.type === "ident") {
      if (token.value === "true") return { type: "literal", value: true };
      if (token.value === "false") return { type: "literal", value: false };
      if (token.value === "null") return { type: "literal", value: null };
      return { type: "ident", name: token.value as string };
    }
    if (token.type === "op" && token.value === "(") {
      const expr = this.parseExpression();
      this.expectOp(")");
      return expr;
    }
    if (token.type === "op" && token.value === "[") {
      const items: Expr[] = [];
      if (!this.peekOp("]")) {
        do {
          items.push(this.parseExpression());
        } while (this.matchOp(","));
      }
      this.expectOp("]");
      return { type: "array", items };
    }
    if (token.type === "op" && token.value === "{") {
      const entries: Array<{ key: string; value: Expr }> = [];
      if (!this.peekOp("}")) {
        do {
          const keyToken = this.consume();
          if (keyToken.type !== "ident" && keyToken.type !== "string") {
            throw this.error("Expected object key", keyToken.pos);
          }
          const key = String(keyToken.value);
          this.expectOp(":");
          const value = this.parseExpression();
          entries.push({ key, value });
        } while (this.matchOp(","));
      }
      this.expectOp("}");
      return { type: "object", entries };
    }
    throw this.error(`Unexpected token`, token.pos);
  }

  private matchOp(op: string): boolean {
    if (this.peekOp(op)) {
      this.consume();
      return true;
    }
    return false;
  }

  private peekOp(op: string): boolean {
    const token = this.peek();
    return token.type === "op" && token.value === op;
  }

  private peekOpIn(ops: readonly string[]): boolean {
    const token = this.peek();
    return token.type === "op" && ops.includes(token.value as string);
  }

  private expect(type: Token["type"]): Token {
    const token = this.consume();
    if (token.type !== type) {
      throw this.error(`Expected ${type}`, token.pos);
    }
    return token;
  }

  private expectOp(op: string): Token {
    const token = this.consume();
    if (token.type !== "op" || token.value !== op) {
      throw this.error(`Expected "${op}"`, token.pos);
    }
    return token;
  }

  private consume(): Token {
    const token = this.tokens[this.index];
    if (!token) {
      const last = this.tokens[this.tokens.length - 1];
      throw this.error("Unexpected end of input", last?.pos ?? 0);
    }
    this.index += 1;
    return token;
  }

  private peek(): Token {
    return this.tokens[this.index] ?? this.tokens[this.tokens.length - 1];
  }

  private error(message: string, pos: number): Error {
    return new Error(`${message} at ${pos}`);
  }
}
