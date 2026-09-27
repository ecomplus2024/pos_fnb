/**
 * Adapter giả lập API Cloudflare D1 trên node:sqlite (DatabaseSync).
 *
 * D1:        env.DB.prepare(sql).bind(...).all() | .first() | .run()
 *            env.DB.batch([stmt, ...])  → [{ results, success, meta }, ...]
 * node:sqlite: db.prepare(sql).all(...params) | .get(...) | .run(...)
 *
 * Mọi call đều trả Promise để code worker `await` nguyên xi.
 */
import { DatabaseSync } from "node:sqlite";

// D1 bind không nhận undefined/boolean — coerce phòng thủ
const coerce = (v) => (v === undefined ? null : typeof v === "boolean" ? (v ? 1 : 0) : v);

// Statement "có trả rows" (SELECT/PRAGMA/... hoặc mọi lệnh có RETURNING)
const isRead = (sql) =>
  /^\s*(SELECT|WITH|PRAGMA|EXPLAIN|VALUES)\b/i.test(sql) || /\bRETURNING\b/i.test(sql);

class D1Statement {
  constructor(db, sql, params = []) {
    this.db = db;
    this.sql = sql;
    this.params = params;
  }

  bind(...args) {
    return new D1Statement(this.db, this.sql, args.map(coerce));
  }

  async all() {
    return this._exec();
  }

  async first() {
    const stmt = this.db.prepare(this.sql);
    if (isRead(this.sql)) return stmt.get(...this.params) ?? null;
    stmt.run(...this.params);
    return null;
  }

  async run() {
    return this._exec();
  }

  _exec() {
    const stmt = this.db.prepare(this.sql);
    if (isRead(this.sql)) {
      return { success: true, results: stmt.all(...this.params), meta: {} };
    }
    const r = stmt.run(...this.params);
    return {
      success: true,
      results: [],
      meta: { changes: r.changes, last_row_id: r.lastInsertRowid },
    };
  }
}

export class D1Database {
  constructor(path) {
    this.db = new DatabaseSync(path);
    this.db.exec("PRAGMA journal_mode = WAL");
    this.db.exec("PRAGMA foreign_keys = ON");
  }

  prepare(sql) {
    return new D1Statement(this.db, sql);
  }

  /** D1 batch = transaction all-or-nothing */
  async batch(statements) {
    this.db.exec("BEGIN");
    try {
      const results = statements.map((s) => s._exec());
      this.db.exec("COMMIT");
      return results;
    } catch (err) {
      try {
        this.db.exec("ROLLBACK");
      } catch {}
      throw err;
    }
  }

  exec(sql) {
    this.db.exec(sql);
  }

  close() {
    this.db.close();
  }
}
