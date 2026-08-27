import type { Database } from 'sql.js'

export interface ColumnInfo {
  name: string
  type: string
  notNull: boolean
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
    const colsResult = db.exec(`PRAGMA table_info(${quoteIdent(name)})`)
    const columns: ColumnInfo[] =
      colsResult.length === 0
        ? []
        : colsResult[0].values.map((row) => {
            const [, colName, colType, notNull, , pk] = row
            return {
              name: String(colName),
              type: String(colType),
              notNull: Number(notNull) === 1,
              primaryKey: Number(pk) > 0,
            }
          })
    return { name, columns }
  })
}
