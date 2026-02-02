export type UnaryOp = '!' | '-' | '+';

export type BinaryOp =
  | '||'
  | '&&'
  | '==='
  | '!=='
  | '<'
  | '>'
  | '<='
  | '>='
  | '+'
  | '-'
  | '*'
  | '/';

export type Expr =
  | LiteralExpr
  | IdentExpr
  | MemberExpr
  | IndexExpr
  | UnaryExpr
  | BinaryExpr
  | TernaryExpr
  | CallExpr;

export interface LiteralExpr {
  type: 'literal';
  value: unknown;
}

export interface IdentExpr {
  type: 'ident';
  name: string;
}

export interface MemberExpr {
  type: 'member';
  object: Expr;
  property: string;
}

export interface IndexExpr {
  type: 'index';
  object: Expr;
  index: Expr;
}

export interface UnaryExpr {
  type: 'unary';
  op: UnaryOp;
  arg: Expr;
}

export interface BinaryExpr {
  type: 'binary';
  op: BinaryOp;
  left: Expr;
  right: Expr;
}

export interface TernaryExpr {
  type: 'ternary';
  test: Expr;
  consequent: Expr;
  alternate: Expr;
}

export interface CallExpr {
  type: 'call';
  callee: Expr;
  args: Expr[];
}
