import type { Database } from 'sql.js'

export interface ColumnInfo {
  name: string
  type: string
  primaryKey: boolean
}

export interface TableSchema {
  name: string
  columns: ColumnInfo[]
}

export function quoteIdent(identifier: string): string {
  return `"${identifier.replace(/"/g, '""')}"`
}

/**
 * Reads the schema straight from the live database (sqlite_master +
 * PRAGMA table_info) rather than from any hand-maintained description, so
 * it can never drift from what's actually seeded and updates immediately
 * after any DDL the workspace runs.
 */
export function introspectSchema(db: Database): TableSchema[] {
  const tablesResult = db.exec(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
  )
  if (tablesResult.length === 0) return []

  const tableNames = tablesResult[0].values.map((row) => String(row[0]))

  return tableNames.map((name) => {
    // PRAGMA table_info returns one row per column, with these result columns:
    //   0 cid | 1 name | 2 type | 3 notnull | 4 dflt_value | 5 pk
    const colsResult = db.exec(`PRAGMA table_info(${quoteIdent(name)})`)
    const columns: ColumnInfo[] =
      colsResult.length === 0
        ? []
        : colsResult[0].values.map((row) => ({
            name: String(row[1]),
            type: String(row[2]),
            primaryKey: Number(row[5]) > 0,
          }))
    return { name, columns }
  })
}
