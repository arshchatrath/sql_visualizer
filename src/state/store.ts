import { create } from 'zustand'
import type { Database } from 'sql.js'
import { loadSqlJs, type ExecOutcome } from '../lib/db/engine'
import { createSeededDatabase } from '../lib/db/seed'
import { introspectSchema, type TableSchema } from '../lib/db/schema'
import { explainQueryPlan, type TraceStage } from '../lib/db/explainPlan'
import { runStatementWithRowCapture, type MutationCaptureSpec, type RowChangeSet } from '../lib/db/rowChanges'
import { generateQuery, buildConditionClause } from '../lib/query/builder'
import {
  createDefaultBuilderState,
  nextClauseId,
  type AlterAction,
  type BuilderState,
  type Condition,
  type CrudMode,
  type DdlColumnDef,
  type GroupByAggregate,
  type HistoryEntry,
  type Scope,
  type SqlColumnType,
} from '../lib/query/types'

export type EngineStatus = 'loading' | 'ready' | 'error'

interface DbStoreState {
  // --- database engine ---
  db: Database | null
  schema: TableSchema[]
  status: EngineStatus
  initError: string | null
  lastTrace: TraceStage[]
  lastOutcome: ExecOutcome | null
  /** Which rows a TABLE-scope mutation touched and their before/after values — null for a plain SELECT or a DDL statement. */
  lastRowChanges: RowChangeSet | null
  lastSql: string | null
  lastExecutionId: number
  history: HistoryEntry[]
  init: () => Promise<void>
  runQuery: (sql: string) => void
  restoreHistoryEntry: (id: string) => void

  // --- query builder ---
  builder: BuilderState
  generatedSql: string
  activeChain: string[]
  setMode: (mode: CrudMode) => void
  setScope: (scope: Scope) => void
  setTable: (table: string) => void
  setJoinTable: (table: string | null) => void
  setJoinColumns: (leftColumn: string, rightColumn: string) => void
  addWhereCondition: () => void
  updateWhereCondition: (id: string, patch: Partial<Condition>) => void
  removeWhereCondition: (id: string) => void
  addHavingCondition: () => void
  updateHavingCondition: (id: string, patch: Partial<Condition>) => void
  removeHavingCondition: (id: string) => void
  toggleGroupByColumn: (column: string) => void
  setGroupByAggregate: (agg: GroupByAggregate | null) => void
  addOrderBy: () => void
  updateOrderBy: (id: string, patch: Partial<{ column: string; direction: 'ASC' | 'DESC' }>) => void
  removeOrderBy: (id: string) => void
  setLimit: (limit: number | null) => void
  setInsertValue: (column: string, value: string) => void
  setSetValue: (column: string, value: string) => void
  setNewTableName: (name: string) => void
  addNewTableColumn: () => void
  updateNewTableColumn: (id: string, patch: Partial<DdlColumnDef>) => void
  removeNewTableColumn: (id: string) => void
  setAlterAction: (action: AlterAction) => void
  setAlterAddColumn: (val: { name: string; type: SqlColumnType }) => void
  setAlterRenameColumn: (val: { from: string; to: string }) => void
  setDropConfirmed: (confirmed: boolean) => void
  execute: () => void
}

// Guards against a duplicate seeded database being created if init() is
// invoked twice (e.g. React StrictMode's double-invoked effects in dev).
let initStarted = false

function newCondition(): Condition {
  return { id: nextClauseId('cond'), column: '', operator: '=', value: '', connector: 'AND' }
}

const HISTORY_LIMIT = 25

function summarizeOutcome(outcome: ExecOutcome): string {
  if (outcome.error) return 'error'
  if (outcome.kind === 'rows') return `${outcome.result?.rows.length ?? 0} row(s)`
  if (outcome.kind === 'rows-modified') return `${outcome.rowsModified} row(s) affected`
  return 'done'
}

/** Recomputes generatedSql/activeChain from the current builder + schema. */
function withRegeneratedQuery(
  builder: BuilderState,
  schema: TableSchema[],
): Pick<DbStoreState, 'builder' | 'generatedSql' | 'activeChain'> {
  const { sql, chain } = generateQuery(builder, schema)
  return { builder, generatedSql: sql, activeChain: chain }
}

export const useDbStore = create<DbStoreState>((set, get) => ({
  db: null,
  schema: [],
  status: 'loading',
  initError: null,
  lastTrace: [],
  lastOutcome: null,
  lastRowChanges: null,
  lastSql: null,
  lastExecutionId: 0,
  history: [],

  builder: createDefaultBuilderState(),
  generatedSql: '',
  activeChain: [],

  init: async () => {
    if (initStarted) return
    initStarted = true
    try {
      const SQL = await loadSqlJs()
      const db = createSeededDatabase(SQL)
      const schema = introspectSchema(db)
      set({ db, schema, status: 'ready', ...withRegeneratedQuery(get().builder, schema) })
    } catch (err) {
      set({ status: 'error', initError: err instanceof Error ? err.message : String(err) })
    }
  },

  runQuery: (sql: string) => {
    const { db, builder, activeChain, history, schema } = get()
    if (!db) return
    const trace = explainQueryPlan(db, sql)

    // Only a TABLE-scope CREATE/UPDATE/DELETE gets row-level capture — a
    // SELECT already returns its own rows, and a DATABASE-scope statement
    // here is DDL (CREATE/ALTER/DROP TABLE), which has no "rows" to speak of.
    const isTableMutation = builder.scope === 'TABLE' && !!builder.table && builder.mode !== 'READ'
    const capture: MutationCaptureSpec | null = isTableMutation
      ? {
          table: builder.table!,
          mode: builder.mode as 'CREATE' | 'UPDATE' | 'DELETE',
          whereSql: buildConditionClause(builder.where, schema, builder.table!),
        }
      : null

    const { outcome, rowChanges } = runStatementWithRowCapture(db, sql, capture)
    const nextSchema = introspectSchema(db)

    const entry: HistoryEntry = {
      id: nextClauseId('hist'),
      sql,
      chain: activeChain,
      builderSnapshot: { ...builder },
      timestamp: Date.now(),
      elapsedMs: outcome.elapsedMs,
      summary: summarizeOutcome(outcome),
    }

    set((state) => ({
      lastTrace: trace,
      lastOutcome: outcome,
      lastRowChanges: rowChanges,
      lastSql: sql,
      schema: nextSchema,
      lastExecutionId: state.lastExecutionId + 1,
      history: [entry, ...history].slice(0, HISTORY_LIMIT),
    }))
  },

  restoreHistoryEntry: (id) => {
    const { history, schema } = get()
    const entry = history.find((h) => h.id === id)
    if (!entry) return
    set(withRegeneratedQuery({ ...entry.builderSnapshot }, schema))
  },

  setMode: (mode) => {
    const { schema, builder } = get()
    const next: BuilderState = { ...createDefaultBuilderState(), mode, table: builder.table }
    set(withRegeneratedQuery(next, schema))
  },

  setScope: (scope) => {
    const { schema, builder } = get()
    const next: BuilderState = { ...createDefaultBuilderState(), mode: builder.mode, scope, table: builder.table }
    set(withRegeneratedQuery(next, schema))
  },

  setTable: (table) => {
    const { schema, builder } = get()
    const next: BuilderState = { ...createDefaultBuilderState(), mode: builder.mode, scope: builder.scope, table }
    set(withRegeneratedQuery(next, schema))
  },

  setJoinTable: (table) => {
    const { schema, builder } = get()
    const next = { ...builder, join: { table, leftColumn: null, rightColumn: null } }
    set(withRegeneratedQuery(next, schema))
  },

  setJoinColumns: (leftColumn, rightColumn) => {
    const { schema, builder } = get()
    const next = { ...builder, join: { ...builder.join, leftColumn, rightColumn } }
    set(withRegeneratedQuery(next, schema))
  },

  addWhereCondition: () => {
    const { schema, builder } = get()
    const next = { ...builder, where: [...builder.where, newCondition()] }
    set(withRegeneratedQuery(next, schema))
  },
  updateWhereCondition: (id, patch) => {
    const { schema, builder } = get()
    const next = { ...builder, where: builder.where.map((c) => (c.id === id ? { ...c, ...patch } : c)) }
    set(withRegeneratedQuery(next, schema))
  },
  removeWhereCondition: (id) => {
    const { schema, builder } = get()
    const next = { ...builder, where: builder.where.filter((c) => c.id !== id) }
    set(withRegeneratedQuery(next, schema))
  },

  addHavingCondition: () => {
    const { schema, builder } = get()
    const next = { ...builder, having: [...builder.having, newCondition()] }
    set(withRegeneratedQuery(next, schema))
  },
  updateHavingCondition: (id, patch) => {
    const { schema, builder } = get()
    const next = { ...builder, having: builder.having.map((c) => (c.id === id ? { ...c, ...patch } : c)) }
    set(withRegeneratedQuery(next, schema))
  },
  removeHavingCondition: (id) => {
    const { schema, builder } = get()
    const next = { ...builder, having: builder.having.filter((c) => c.id !== id) }
    set(withRegeneratedQuery(next, schema))
  },

  toggleGroupByColumn: (column) => {
    const { schema, builder } = get()
    const has = builder.groupBy.includes(column)
    const groupBy = has ? builder.groupBy.filter((c) => c !== column) : [...builder.groupBy, column]
    const groupByAggregate = groupBy.length === 0 ? null : builder.groupByAggregate
    set(withRegeneratedQuery({ ...builder, groupBy, groupByAggregate }, schema))
  },
  setGroupByAggregate: (agg) => {
    const { schema, builder } = get()
    set(withRegeneratedQuery({ ...builder, groupByAggregate: agg }, schema))
  },

  addOrderBy: () => {
    const { schema, builder } = get()
    const next = {
      ...builder,
      orderBy: [...builder.orderBy, { id: nextClauseId('order'), column: '', direction: 'ASC' as const }],
    }
    set(withRegeneratedQuery(next, schema))
  },
  updateOrderBy: (id, patch) => {
    const { schema, builder } = get()
    const next = { ...builder, orderBy: builder.orderBy.map((o) => (o.id === id ? { ...o, ...patch } : o)) }
    set(withRegeneratedQuery(next, schema))
  },
  removeOrderBy: (id) => {
    const { schema, builder } = get()
    const next = { ...builder, orderBy: builder.orderBy.filter((o) => o.id !== id) }
    set(withRegeneratedQuery(next, schema))
  },

  setLimit: (limit) => {
    const { schema, builder } = get()
    set(withRegeneratedQuery({ ...builder, limit }, schema))
  },

  setInsertValue: (column, value) => {
    const { schema, builder } = get()
    const next = { ...builder, insertValues: { ...builder.insertValues, [column]: value } }
    set(withRegeneratedQuery(next, schema))
  },
  setSetValue: (column, value) => {
    const { schema, builder } = get()
    const next = { ...builder, setValues: { ...builder.setValues, [column]: value } }
    set(withRegeneratedQuery(next, schema))
  },

  setNewTableName: (name) => {
    const { schema, builder } = get()
    set(withRegeneratedQuery({ ...builder, newTableName: name }, schema))
  },
  addNewTableColumn: () => {
    const { schema, builder } = get()
    const col: DdlColumnDef = {
      id: nextClauseId('ddlcol'),
      name: '',
      type: 'TEXT',
      primaryKey: false,
      notNull: false,
    }
    set(withRegeneratedQuery({ ...builder, newTableColumns: [...builder.newTableColumns, col] }, schema))
  },
  updateNewTableColumn: (id, patch) => {
    const { schema, builder } = get()
    const next = {
      ...builder,
      newTableColumns: builder.newTableColumns.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    }
    set(withRegeneratedQuery(next, schema))
  },
  removeNewTableColumn: (id) => {
    const { schema, builder } = get()
    const next = { ...builder, newTableColumns: builder.newTableColumns.filter((c) => c.id !== id) }
    set(withRegeneratedQuery(next, schema))
  },

  setAlterAction: (action) => {
    const { schema, builder } = get()
    set(withRegeneratedQuery({ ...builder, alterAction: action }, schema))
  },
  setAlterAddColumn: (val) => {
    const { schema, builder } = get()
    set(withRegeneratedQuery({ ...builder, alterAddColumn: val }, schema))
  },
  setAlterRenameColumn: (val) => {
    const { schema, builder } = get()
    set(withRegeneratedQuery({ ...builder, alterRenameColumn: val }, schema))
  },
  setDropConfirmed: (confirmed) => {
    const { schema, builder } = get()
    set(withRegeneratedQuery({ ...builder, dropConfirmed: confirmed }, schema))
  },

  execute: () => {
    const { generatedSql, runQuery, builder } = get()
    if (!generatedSql) return
    const isDdl = builder.scope === 'DATABASE' && builder.mode !== 'READ'
    runQuery(generatedSql)
    if (isDdl) {
      const outcome = get().lastOutcome
      if (outcome && !outcome.error) {
        const latestSchema = get().schema
        const nextTable = builder.mode === 'CREATE' ? builder.newTableName.trim() || null : null
        const next: BuilderState = { ...createDefaultBuilderState(), table: nextTable }
        set(withRegeneratedQuery(next, latestSchema))
      }
    }
  },
}))
