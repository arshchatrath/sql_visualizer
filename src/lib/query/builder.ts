import type { TableSchema } from '../db/schema'
import type { BuilderState, ComparisonOperator, Condition } from './types'

export interface GeneratedQuery {
  sql: string
  /** Ordered clause names driving the QueryChain chip trail — derived, never hardcoded. */
  chain: string[]
}

const EMPTY_QUERY: GeneratedQuery = { sql: '', chain: [] }

function resolveColumnType(schema: TableSchema[], primaryTable: string, columnRef: string): string | null {
  let tableName = primaryTable
  let colName = columnRef
  if (columnRef.includes('.')) {
    const [t, c] = columnRef.split('.')
    tableName = t
    colName = c
  }
  const table = schema.find((t) => t.name === tableName)
  return table?.columns.find((c) => c.name === colName)?.type ?? null
}

function isNumericType(type: string | null): boolean | null {
  if (!type) return null
  return /INT|REAL|FLOA|DOUB|NUM/i.test(type)
}

function formatLiteral(value: string, columnType: string | null, operator?: ComparisonOperator): string {
  const trimmed = value.trim()
  if (operator === 'LIKE') return `'${trimmed.replace(/'/g, "''")}'`

  const numeric = isNumericType(columnType)
  if (numeric === true) return trimmed
  if (numeric === false) return `'${trimmed.replace(/'/g, "''")}'`
  // Unknown column type (shouldn't normally happen): best-effort guess.
  if (trimmed !== '' && !Number.isNaN(Number(trimmed))) return trimmed
  return `'${trimmed.replace(/'/g, "''")}'`
}

/**
 * Exported so the row-change capture layer (lib/db/rowChanges.ts) can build
 * the exact same WHERE clause used by the real UPDATE/DELETE statement, to
 * snapshot precisely the rows that statement will touch — never a
 * hand-approximated re-derivation that could drift from the real SQL.
 */
export function buildConditionClause(
  conditions: Condition[],
  schema: TableSchema[],
  primaryTable: string,
): string {
  const filled = conditions.filter((c) => c.column && c.value.trim() !== '')
  if (filled.length === 0) return ''
  return filled
    .map((c, i) => {
      const type = resolveColumnType(schema, primaryTable, c.column)
      const expr = `${c.column} ${c.operator} ${formatLiteral(c.value, type, c.operator)}`
      return i === 0 ? expr : `${c.connector} ${expr}`
    })
    .join(' ')
}

function buildSelectList(state: BuilderState): string {
  if (state.groupBy.length === 0) return '*'

  const groupCols = state.groupBy.join(', ')
  if (!state.groupByAggregate) return groupCols

  const { fn, column } = state.groupByAggregate
  const aggExpr = fn === 'COUNT' && column === '*' ? 'COUNT(*)' : `${fn}(${column})`
  const alias = `${fn.toLowerCase()}_${column === '*' ? 'all' : column.replace('.', '_')}`
  return `${groupCols}, ${aggExpr} AS ${alias}`
}

function buildInsert(state: BuilderState, schema: TableSchema[]): GeneratedQuery {
  if (!state.table) return EMPTY_QUERY
  const filled = Object.entries(state.insertValues).filter(([, v]) => v.trim() !== '')
  if (filled.length === 0) return { sql: '', chain: ['INSERT INTO', 'VALUES'] }

  const cols = filled.map(([col]) => col).join(', ')
  const vals = filled
    .map(([col, val]) => formatLiteral(val, resolveColumnType(schema, state.table!, col)))
    .join(', ')

  return {
    sql: `INSERT INTO ${state.table} (${cols})\nVALUES (${vals});`,
    chain: ['INSERT INTO', 'VALUES'],
  }
}

function buildSelect(state: BuilderState, schema: TableSchema[]): GeneratedQuery {
  if (!state.table) return EMPTY_QUERY

  const chain: string[] = ['SELECT']
  let from = state.table

  const joinActive = state.scope === 'DATABASE' && state.join.table && state.join.leftColumn && state.join.rightColumn
  if (joinActive) {
    from += `\nJOIN ${state.join.table} ON ${state.join.leftColumn} = ${state.join.rightColumn}`
    chain.push('JOIN')
  }

  let sql = `SELECT ${buildSelectList(state)}\nFROM ${from}`

  const whereClause = buildConditionClause(state.where, schema, state.table)
  if (whereClause) {
    sql += `\nWHERE ${whereClause}`
    chain.push('WHERE')
  }

  if (state.groupBy.length > 0) {
    sql += `\nGROUP BY ${state.groupBy.join(', ')}`
    chain.push('GROUP BY')

    const havingClause = buildConditionClause(state.having, schema, state.table)
    if (havingClause) {
      sql += `\nHAVING ${havingClause}`
      chain.push('HAVING')
    }
  }

  if (state.orderBy.length > 0) {
    sql += `\nORDER BY ${state.orderBy.map((o) => `${o.column} ${o.direction}`).join(', ')}`
    chain.push('ORDER BY')
  }

  if (state.limit != null && state.limit > 0) {
    sql += `\nLIMIT ${state.limit}`
    chain.push('LIMIT')
  }

  return { sql: sql + ';', chain }
}

function buildUpdate(state: BuilderState, schema: TableSchema[]): GeneratedQuery {
  if (!state.table) return EMPTY_QUERY
  const filled = Object.entries(state.setValues).filter(([, v]) => v.trim() !== '')
  if (filled.length === 0) return { sql: '', chain: ['UPDATE', 'SET'] }

  const setClause = filled
    .map(([col, val]) => `${col} = ${formatLiteral(val, resolveColumnType(schema, state.table!, col))}`)
    .join(', ')

  let sql = `UPDATE ${state.table}\nSET ${setClause}`
  const chain = ['UPDATE', 'SET']

  const whereClause = buildConditionClause(state.where, schema, state.table)
  if (whereClause) {
    sql += `\nWHERE ${whereClause}`
    chain.push('WHERE')
  }

  return { sql: sql + ';', chain }
}

function buildDelete(state: BuilderState, schema: TableSchema[]): GeneratedQuery {
  if (!state.table) return EMPTY_QUERY

  let sql = `DELETE FROM ${state.table}`
  const chain = ['DELETE FROM']

  const whereClause = buildConditionClause(state.where, schema, state.table)
  if (whereClause) {
    sql += `\nWHERE ${whereClause}`
    chain.push('WHERE')
  }

  return { sql: sql + ';', chain }
}

function buildCreateTableDdl(state: BuilderState): GeneratedQuery {
  const name = state.newTableName.trim()
  const columns = state.newTableColumns.filter((c) => c.name.trim() !== '')
  if (!name || columns.length === 0) return { sql: '', chain: ['CREATE TABLE'] }

  const columnDefs = columns
    .map((c) => {
      let def = `${c.name.trim()} ${c.type}`
      if (c.primaryKey) def += ' PRIMARY KEY'
      else if (c.notNull) def += ' NOT NULL'
      return def
    })
    .join(',\n  ')

  return { sql: `CREATE TABLE ${name} (\n  ${columnDefs}\n);`, chain: ['CREATE TABLE'] }
}

function buildAlterTableDdl(state: BuilderState): GeneratedQuery {
  if (!state.table) return EMPTY_QUERY

  if (state.alterAction === 'add-column') {
    const { name, type } = state.alterAddColumn
    if (!name.trim()) return { sql: '', chain: ['ALTER TABLE', 'ADD COLUMN'] }
    return {
      sql: `ALTER TABLE ${state.table}\nADD COLUMN ${name.trim()} ${type};`,
      chain: ['ALTER TABLE', 'ADD COLUMN'],
    }
  }

  const { from, to } = state.alterRenameColumn
  if (!from || !to.trim()) return { sql: '', chain: ['ALTER TABLE', 'RENAME COLUMN'] }
  return {
    sql: `ALTER TABLE ${state.table}\nRENAME COLUMN ${from} TO ${to.trim()};`,
    chain: ['ALTER TABLE', 'RENAME COLUMN'],
  }
}

function buildDropTableDdl(state: BuilderState): GeneratedQuery {
  if (!state.table) return EMPTY_QUERY
  return { sql: `DROP TABLE ${state.table};`, chain: ['DROP TABLE'] }
}

/** Pure: (builder state, live schema) -> generated SQL + active clause chain. */
export function generateQuery(state: BuilderState, schema: TableSchema[]): GeneratedQuery {
  if (state.scope === 'DATABASE') {
    switch (state.mode) {
      case 'READ':
        return state.table ? buildSelect(state, schema) : EMPTY_QUERY
      case 'CREATE':
        return buildCreateTableDdl(state)
      case 'UPDATE':
        return buildAlterTableDdl(state)
      case 'DELETE':
        return buildDropTableDdl(state)
    }
  }

  if (!state.table) return EMPTY_QUERY
  switch (state.mode) {
    case 'CREATE':
      return buildInsert(state, schema)
    case 'READ':
      return buildSelect(state, schema)
    case 'UPDATE':
      return buildUpdate(state, schema)
    case 'DELETE':
      return buildDelete(state, schema)
  }
}
