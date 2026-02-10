export type TokenType = "number" | "string" | "ident" | "op" | "eof";

export interface Token {
  type: TokenType;
  value?: string | number;
  pos: number;
}

const MULTI_CHAR_OPS = ["===", "!==", "<=", ">=", "&&", "||"];
const SINGLE_CHAR_OPS = new Set([
  "<",
  ">",
  "+",
  "-",
  "*",
  "/",
  "!",
  "?",
  ":",
  "{",
  "}",
  ".",
  ",",
  "(",
  ")",
  "[",
  "]",
]);

export function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  const push = (type: TokenType, value: string | number | undefined, pos: number) => {
    tokens.push({ type, value, pos });
  };

  while (i < input.length) {
    const ch = input[i];

    if (/\s/.test(ch)) {
      i += 1;
      continue;
    }

    const multi = MULTI_CHAR_OPS.find((op) => input.startsWith(op, i));
    if (multi) {
      push("op", multi, i);
      i += multi.length;
      continue;
    }

    if (SINGLE_CHAR_OPS.has(ch)) {
      push("op", ch, i);
      i += 1;
      continue;
    }

    if (ch === '"' || ch === "'") {
      const quote = ch;
      const start = i;
      i += 1;
      let value = "";
      let terminated = false;
      while (i < input.length) {
        const current = input[i];
        if (current === "\\") {
          const next = input[i + 1];
          if (next === undefined) {
            throw new Error(`Unterminated string at ${start}`);
          }
          switch (next) {
            case "n":
              value += "\n";
              break;
            case "r":
              value += "\r";
              break;
            case "t":
              value += "\t";
              break;
            case '"':
              value += '"';
              break;
            case "'":
              value += "'";
              break;
            case "\\":
              value += "\\";
              break;
            default:
              value += next;
          }
          i += 2;
          continue;
        }
        if (current === quote) {
          i += 1;
          push("string", value, start);
          terminated = true;
          break;
        }
        value += current;
        i += 1;
      }
      if (!terminated && i >= input.length) {
        throw new Error(`Unterminated string at ${start}`);
      }
      continue;
    }

    if (/[0-9]/.test(ch)) {
      const start = i;
      let num = ch;
      i += 1;
      while (i < input.length && /[0-9]/.test(input[i])) {
        num += input[i];
        i += 1;
      }
      if (input[i] === "." && /[0-9]/.test(input[i + 1] ?? "")) {
        num += ".";
        i += 1;
        while (i < input.length && /[0-9]/.test(input[i])) {
          num += input[i];
          i += 1;
        }
      }
      push("number", Number.parseFloat(num), start);
      continue;
    }

    if (/[A-Za-z_$]/.test(ch)) {
      const start = i;
      let ident = ch;
      i += 1;
      while (i < input.length && /[A-Za-z0-9_$]/.test(input[i])) {
        ident += input[i];
        i += 1;
      }
      push("ident", ident, start);
      continue;
    }

    throw new Error(`Unexpected character "${ch}" at ${i}`);
  }

  tokens.push({ type: "eof", pos: input.length });
  return tokens;
}
