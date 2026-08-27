import initSqlJs, { type Database, type SqlJsStatic } from 'sql.js'

let sqlJsPromise: Promise<SqlJsStatic> | null = null

/**
 * Loads the sql.js WASM runtime once and caches the promise.
 *
 * The path is resolved against Vite's configured base rather than hardcoded
 * to "/sql-wasm.wasm". Hosted below a domain root — GitHub Pages serves a
 * project at /<repo-name>/ — the rooted path 404s, and because this WASM *is*
 * the database, the whole app dies with "failed to start query engine" rather
 * than degrading. BASE_URL is "/" during local dev, so this is identical
 * there.
 */
export function loadSqlJs(): Promise<SqlJsStatic> {
  if (!sqlJsPromise) {
    // The requested filename is deliberately ignored: sql.js asks for its
    // build-specific name (sql-wasm-browser.wasm), while the binary vendored
    // into public/ is plain sql-wasm.wasm. Only the location needs fixing.
    const base = import.meta.env.BASE_URL
    sqlJsPromise = initSqlJs({
      locateFile: () => `${base}${base.endsWith('/') ? '' : '/'}sql-wasm.wasm`,
    })
  }
  return sqlJsPromise
}

export interface QueryResult {
  columns: string[]
  rows: unknown[][]
}

export type ExecOutcomeKind = 'rows' | 'rows-modified' | 'none'

// SQLite's sqlite3_changes() (what db.getRowsModified() reads) only ever
// reflects the most recently completed INSERT/UPDATE/DELETE — it is not
// reset or updated by DDL. Without this check, running CREATE TABLE /
// ALTER TABLE / DROP TABLE right after a DML statement would surface that
// stale row count as if the DDL itself had "affected" rows.
const DDL_STATEMENT = /^\s*(CREATE|ALTER|DROP)\b/i

export interface ExecOutcome {
  kind: ExecOutcomeKind
  result: QueryResult | null
  rowsModified: number | null
  elapsedMs: number
  error: string | null
}

/**
 * Runs one (possibly multi-statement) block of SQL against a live
 * database, timing the real `db.exec()` call with performance.now(). This
 * is the only place elapsed time is measured — nothing here is simulated.
 */
export function runStatement(db: Database, sql: string): ExecOutcome {
  const start = performance.now()
  try {
    const execResult = db.exec(sql)
    const elapsedMs = performance.now() - start

    if (execResult.length > 0) {
      const last = execResult[execResult.length - 1]
      return {
        kind: 'rows',
        result: { columns: last.columns, rows: last.values },
        rowsModified: null,
        elapsedMs,
        error: null,
      }
    }

    if (DDL_STATEMENT.test(sql)) {
      return { kind: 'none', result: null, rowsModified: null, elapsedMs, error: null }
    }

    const rowsModified = db.getRowsModified()
    return {
      kind: rowsModified > 0 ? 'rows-modified' : 'none',
      result: null,
      rowsModified,
      elapsedMs,
      error: null,
    }
  } catch (err) {
    const elapsedMs = performance.now() - start
    return {
      kind: 'none',
      result: null,
      rowsModified: null,
      elapsedMs,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}
