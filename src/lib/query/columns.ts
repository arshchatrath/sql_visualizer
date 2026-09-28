import type { TableSchema } from '../db/schema'
import type { BuilderState } from './types'

/**
 * Columns the current builder state can reference. Unqualified at TABLE
 * scope; qualified as `table.column` once a JOIN is active at DATABASE
 * scope, so generated SQL never needs its own re-qualification step —
 * whatever value a picker returns is exactly what goes into the query.
 */
export function availableColumns(builder: BuilderState, schema: TableSchema[]): string[] {
  const primary = schema.find((t) => t.name === builder.table)
  if (!primary) return []

  if (builder.scope === 'DATABASE' && builder.join.table) {
    const joined = schema.find((t) => t.name === builder.join.table)
    const tables = joined ? [primary, joined] : [primary]
    return tables.flatMap((t) => t.columns.map((c) => `${t.name}.${c.name}`))
  }

  return primary.columns.map((c) => c.name)
}
