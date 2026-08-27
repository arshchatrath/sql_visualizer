import type { Database } from 'sql.js'

export interface TraceStage {
  id: number
  parent: number
  detail: string
}

/**
 * Runs SQLite's own EXPLAIN QUERY PLAN against a statement and returns its
 * real stage list, verified directly against sql.js (columns come back as
 * id | parent | notused | detail on the bundled SQLite 3.49).
 *
 * Statements SQLite can't produce a plan for — a bare `INSERT ... VALUES`,
 * `CREATE TABLE`, `DROP TABLE`, and similar — come back as an empty array.
 * That's intentional: the trace panel shows a short trace rather than
 * padding it out with an invented stage.
 */
export function explainQueryPlan(db: Database, sql: string): TraceStage[] {
  try {
    const result = db.exec(`EXPLAIN QUERY PLAN ${sql}`)
    if (result.length === 0) return []

    const { columns, values } = result[0]
    const idIdx = columns.indexOf('id')
    const parentIdx = columns.indexOf('parent')
    const detailIdx = columns.indexOf('detail')
    if (detailIdx === -1) return []

    return values.map((row) => ({
      id: Number(row[idIdx]),
      parent: Number(row[parentIdx]),
      detail: String(row[detailIdx]),
    }))
  } catch {
    // Statement doesn't support EXPLAIN QUERY PLAN — no plan, not an error
    // surfaced to the user (the real execution attempt will surface any
    // actual problem with the statement).
    return []
  }
}
