export type CrudMode = 'CREATE' | 'READ' | 'UPDATE' | 'DELETE'
export type Scope = 'TABLE' | 'DATABASE'

export type ComparisonOperator = '=' | '!=' | '>' | '>=' | '<' | '<=' | 'LIKE'

export interface Condition {
  id: string
  column: string
  operator: ComparisonOperator
  value: string
  /** How this condition connects to the PREVIOUS one. Ignored on the first condition. */
  connector: 'AND' | 'OR'
}

export interface OrderByClause {
  id: string
  column: string
  direction: 'ASC' | 'DESC'
}

export type AggregateFn = 'COUNT' | 'SUM' | 'AVG' | 'MIN' | 'MAX'

export interface GroupByAggregate {
  fn: AggregateFn
  /** A column name, or '*' for COUNT(*). */
  column: string
}

export interface JoinSpec {
  table: string | null
  leftColumn: string | null
  rightColumn: string | null
}

export type SqlColumnType = 'INTEGER' | 'TEXT' | 'REAL'

export interface DdlColumnDef {
  id: string
  name: string
  type: SqlColumnType
  primaryKey: boolean
  notNull: boolean
}

export type AlterAction = 'add-column' | 'rename-column'

export interface BuilderState {
  mode: CrudMode
  scope: Scope
  table: string | null
  join: JoinSpec
  where: Condition[]
  groupBy: string[]
  groupByAggregate: GroupByAggregate | null
  having: Condition[]
  orderBy: OrderByClause[]
  limit: number | null
  /** column name -> raw input value. Empty/missing = column omitted. */
  setValues: Record<string, string>
  insertValues: Record<string, string>
  // --- database-scope DDL (CREATE/UPDATE/DELETE + DATABASE) ---
  newTableName: string
  newTableColumns: DdlColumnDef[]
  alterAction: AlterAction
  alterAddColumn: { name: string; type: SqlColumnType }
  alterRenameColumn: { from: string; to: string }
  dropConfirmed: boolean
}

export function createDefaultBuilderState(): BuilderState {
  return {
    mode: 'READ',
    scope: 'TABLE',
    table: null,
    join: { table: null, leftColumn: null, rightColumn: null },
    where: [],
    groupBy: [],
    groupByAggregate: null,
    having: [],
    orderBy: [],
    limit: null,
    setValues: {},
    insertValues: {},
    newTableName: '',
    newTableColumns: [],
    alterAction: 'add-column',
    alterAddColumn: { name: '', type: 'TEXT' },
    alterRenameColumn: { from: '', to: '' },
    dropConfirmed: false,
  }
}

let nextId = 1
export function nextClauseId(prefix: string): string {
  nextId += 1
  return `${prefix}-${nextId}`
}

export interface HistoryEntry {
  id: string
  sql: string
  chain: string[]
  /** Full builder state at the moment this ran, so "restore" repopulates the actual blocks — not a SQL-parsing exercise. */
  builderSnapshot: BuilderState
  timestamp: number
  elapsedMs: number
  summary: string
}
