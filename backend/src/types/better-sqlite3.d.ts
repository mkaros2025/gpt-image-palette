declare module 'better-sqlite3' {
  export interface Statement {
    get(...args: unknown[]): unknown;
    run(...args: unknown[]): { changes: number; lastInsertRowid: number | bigint };
    all(...args: unknown[]): unknown[];
  }

  export interface Database {
    pragma(statement: string): unknown;
    exec(sql: string): void;
    prepare(sql: string): Statement;
    close(): void;
  }

  const Database: {
    new (filename: string, options?: Record<string, unknown>): Database;
  };

  export default Database;
}
