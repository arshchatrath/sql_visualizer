import type { TableSchema } from '../db/schema'
import type { BuilderState } from './types'

export interface ColumnOption {
  value: string
  label: string
}

/**
 * Columns the current builder state can reference. Unqualified at TABLE
 * scope; qualified as `table.column` once a JOIN is active at DATABASE
 * scope, so generated SQL never needs its own re-qualification step —
 * whatever value a picker returns is exactly what goes into the query.
 */
export function availableColumns(builder: BuilderState, schema: TableSchema[]): ColumnOption[] {
  if (!builder.table) return []
  const primary = schema.find((t) => t.name === builder.table)
  if (!primary) return []

  if (builder.scope === 'DATABASE' && builder.join.table) {
    const joined = schema.find((t) => t.name === builder.join.table)
    const primaryCols = primary.columns.map((c) => ({
      value: `${primary.name}.${c.name}`,
      label: `${primary.name}.${c.name}`,
    }))
    const joinedCols = joined
      ? joined.columns.map((c) => ({ value: `${joined.name}.${c.name}`, label: `${joined.name}.${c.name}` }))
      : []
    return [...primaryCols, ...joinedCols]
  }

  return primary.columns.map((c) => ({ value: c.name, label: c.name }))
}
