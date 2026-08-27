import type { TableSchema } from '../db/schema'

/**
 * Best-effort FK-shaped guess for how two tables in this schema join —
 * looks for a `<singular-table>_id` column on one side pointing at the
 * other's `id`. Returns null (leaving the picker blank) rather than a
 * wrong guess when nothing matches.
 */
export function suggestJoinColumns(
  primaryTable: string,
  joinTable: string,
  schema: TableSchema[],
): { left: string; right: string } | null {
  const primary = schema.find((t) => t.name === primaryTable)
  const joined = schema.find((t) => t.name === joinTable)
  if (!primary || !joined) return null

  const singularize = (name: string) => (name.endsWith('s') ? name.slice(0, -1) : name)
  const fkNameFor = (tableName: string) => `${singularize(tableName)}_id`

  const fkInJoined = joined.columns.find((c) => c.name === fkNameFor(primaryTable))
  if (fkInJoined && primary.columns.some((c) => c.name === 'id')) {
    return { left: `${joinTable}.${fkInJoined.name}`, right: `${primaryTable}.id` }
  }

  const fkInPrimary = primary.columns.find((c) => c.name === fkNameFor(joinTable))
  if (fkInPrimary && joined.columns.some((c) => c.name === 'id')) {
    return { left: `${primaryTable}.${fkInPrimary.name}`, right: `${joinTable}.id` }
  }

  return null
}
