// Native (Android/iOS): SQLite lokal via expo-sqlite. 100% offline.
import * as SQLite from "expo-sqlite";

import { SCHEMA } from "./schema";

export type Params = (string | number | null | undefined)[];
export interface DB {
  all<T>(sql: string, params?: Params): Promise<T[]>;
  get<T>(sql: string, params?: Params): Promise<T | null>;
  run(sql: string, params?: Params): Promise<{ lastId: number; changes: number }>;
  tx(fn: () => Promise<void>): Promise<void>;
}

const clean = (p: Params) => p.map((v) => (v === undefined ? null : v)) as SQLite.SQLiteBindValue[];

let instance: Promise<DB> | null = null;

async function init(): Promise<DB> {
  const db = await SQLite.openDatabaseAsync("kosmanager.db");
  await db.execAsync("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;" + SCHEMA);
  return {
    all: (sql, params = []) => db.getAllAsync(sql, clean(params)),
    get: async (sql, params = []) => (await db.getFirstAsync(sql, clean(params))) ?? null,
    run: async (sql, params = []) => {
      const r = await db.runAsync(sql, clean(params));
      return { lastId: r.lastInsertRowId, changes: r.changes };
    },
    tx: (fn) => db.withTransactionAsync(fn),
  };
}

export function getDb(): Promise<DB> {
  if (!instance) instance = init();
  return instance;
}
