export interface Statement {
  get(...params: unknown[]): unknown | undefined;
  all(...params: unknown[]): unknown[];
  run(...params: unknown[]): { changes: number; lastInsertRowid: number | bigint };
}

export interface Database {
  prepare(sql: string): Statement;
  exec(sql: string): void;
  pragma(pragma: string, value?: unknown): unknown;
  transaction<T>(fn: () => T): () => T;
}
