// Web preview only: SQLite yang sama dijalankan via sql.js (WASM) dan disimpan di localStorage.
// Aplikasi Android memakai client.ts (expo-sqlite) yang sepenuhnya offline.
import { SCHEMA } from "./schema";
import type { DB, Params } from "./client";

export type { DB, Params };

const VER = "1.10.3";
const CDN = `https://cdn.jsdelivr.net/npm/sql.js@${VER}/dist/`;
const KEY = "kosmanager_web_db";

function loadScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    const w = window as any;
    if (w.initSqlJs) return resolve();
    const s = document.createElement("script");
    s.src = CDN + "sql-wasm.js";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Gagal memuat mesin database"));
    document.head.appendChild(s);
  });
}

function toB64(bytes: Uint8Array) {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + 0x8000)));
  }
  return btoa(bin);
}
function fromB64(s: string) {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

const clean = (p: Params) => p.map((v) => (v === undefined ? null : v));

let instance: Promise<DB> | null = null;

async function init(): Promise<DB> {
  await loadScript();
  const SQL = await (window as any).initSqlJs({ locateFile: (f: string) => CDN + f });
  const saved = localStorage.getItem(KEY);
  const db = saved ? new SQL.Database(fromB64(saved)) : new SQL.Database();
  db.exec("PRAGMA foreign_keys = ON;" + SCHEMA);
  let inTx = false;
  const persist = () => {
    if (inTx) return;
    localStorage.setItem(KEY, toB64(db.export()));
    db.exec("PRAGMA foreign_keys = ON;");
  };
  const all = <T,>(sql: string, params: Params = []): T[] => {
    const st = db.prepare(sql);
    st.bind(clean(params));
    const rows: T[] = [];
    while (st.step()) rows.push(st.getAsObject() as T);
    st.free();
    return rows;
  };
  return {
    all: async (sql, params) => all(sql, params),
    get: async <T,>(sql: string, params?: Params) => all<T>(sql, params)[0] ?? null,
    run: async (sql, params = []) => {
      db.run(sql, clean(params));
      const changes = db.getRowsModified();
      const lastId = Number(db.exec("SELECT last_insert_rowid()")[0]?.values[0][0] ?? 0);
      persist();
      return { lastId, changes };
    },
    tx: async (fn) => {
      db.exec("BEGIN");
      inTx = true;
      try {
        await fn();
        db.exec("COMMIT");
      } catch (e) {
        db.exec("ROLLBACK");
        throw e;
      } finally {
        inTx = false;
        persist();
      }
    },
  };
}

export function getDb(): Promise<DB> {
  if (!instance) instance = init();
  return instance;
}
