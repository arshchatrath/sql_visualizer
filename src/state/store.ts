import { create } from 'zustand'
import type { Database } from 'sql.js'
import { loadSqlJs, summarizeOutcome, type ExecOutcome } from '../lib/db/engine'
import { createSeededDatabase } from '../lib/db/seed'
import { introspectSchema, type TableSchema } from '../lib/db/schema'
import { explainQueryPlan, type TraceStage } from '../lib/db/explainPlan'
import { runStatementWithRowCapture, type RowChangeSet } from '../lib/db/rowChanges'
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

interface DbStoreState {
  // --- database engine ---
  db: Database | null
  schema: TableSchema[]
  status: 'loading' | 'ready' | 'error'
  initError: string | null
  lastTrace: TraceStage[]
  lastOutcome: ExecOutcome | null
  /** Which rows a TABLE-scope mutation touched and their before/after values — null for a plain SELECT or a DDL statement. */
  lastRowChanges: RowChangeSet | null
  lastSql: string | null
  lastExecutionId: number
  history: HistoryEntry[]
  init: () => Promise<void>
  execute: () => void
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
}

// Guards against a duplicate seeded database being created if init() is
// invoked twice (e.g. React StrictMode's double-invoked effects in dev).
let initStarted = false

const HISTORY_LIMIT = 25

function newCondition(): Condition {
  return { id: nextClauseId('cond'), column: '', operator: '=', value: '', connector: 'AND' }
}

export const useDbStore = create<DbStoreState>((set, get) => {
  /** Every builder change goes through here, so the generated SQL and clause chain always match it. */
  const setBuilder = (builder: BuilderState) => {
    const { sql, chain } = generateQuery(builder, get().schema)
    set({ builder, generatedSql: sql, activeChain: chain })
  }
  const updateBuilder = (change: (b: BuilderState) => Partial<BuilderState>) => {
    const { builder } = get()
    setBuilder({ ...builder, ...change(builder) })
  }
  /** Mode/scope/table switches start the blocks over, keeping only what's passed in. */
  const resetBuilder = (keep: Partial<BuilderState>) => setBuilder({ ...createDefaultBuilderState(), ...keep })

  return {
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
        const db = createSeededDatabase(await loadSqlJs())
        set({ db, schema: introspectSchema(db), status: 'ready' })
      } catch (err) {
        set({ status: 'error', initError: err instanceof Error ? err.message : String(err) })
      }
    },

    execute: () => {
      const { db, builder, generatedSql: sql, activeChain, schema } = get()
      if (!db || !sql) return
      const trace = explainQueryPlan(db, sql)

      // Only a TABLE-scope CREATE/UPDATE/DELETE gets row-level capture — a
      // SELECT already returns its own rows, and a DATABASE-scope statement
      // here is DDL (CREATE/ALTER/DROP TABLE), which has no "rows" to speak of.
      const { scope, table, mode } = builder
      const capture =
        scope === 'TABLE' && table && mode !== 'READ'
          ? { table, mode, whereSql: buildConditionClause(builder.where, schema, table) }
          : null

      const { outcome, rowChanges } = runStatementWithRowCapture(db, sql, capture)

      const entry: HistoryEntry = {
        id: nextClauseId('hist'),
        sql,
        chain: activeChain,
        builderSnapshot: builder,
        timestamp: Date.now(),
        elapsedMs: outcome.elapsedMs,
        summary: summarizeOutcome(outcome),
      }

      set((state) => ({
        lastTrace: trace,
        lastOutcome: outcome,
        lastRowChanges: rowChanges,
        lastSql: sql,
        schema: introspectSchema(db),
        lastExecutionId: state.lastExecutionId + 1,
        history: [entry, ...state.history].slice(0, HISTORY_LIMIT),
      }))

      // DDL changes the schema out from under the builder, so start it over —
      // pointed at the new table after a CREATE TABLE.
      const isDdl = scope === 'DATABASE' && mode !== 'READ'
      if (isDdl && !outcome.error) {
        resetBuilder({ table: mode === 'CREATE' ? builder.newTableName.trim() || null : null })
      }
    },

    restoreHistoryEntry: (id) => {
      const entry = get().history.find((h) => h.id === id)
      if (entry) setBuilder(entry.builderSnapshot)
    },

    setMode: (mode) => resetBuilder({ mode, table: get().builder.table }),
    setScope: (scope) => resetBuilder({ mode: get().builder.mode, scope, table: get().builder.table }),
    setTable: (table) => resetBuilder({ mode: get().builder.mode, scope: get().builder.scope, table }),

    setJoinTable: (table) => updateBuilder(() => ({ join: { table, leftColumn: null, rightColumn: null } })),
    setJoinColumns: (leftColumn, rightColumn) =>
      updateBuilder((b) => ({ join: { ...b.join, leftColumn, rightColumn } })),

    addWhereCondition: () => updateBuilder((b) => ({ where: [...b.where, newCondition()] })),
    updateWhereCondition: (id, patch) =>
      updateBuilder((b) => ({ where: b.where.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),
    removeWhereCondition: (id) => updateBuilder((b) => ({ where: b.where.filter((c) => c.id !== id) })),

    addHavingCondition: () => updateBuilder((b) => ({ having: [...b.having, newCondition()] })),
    updateHavingCondition: (id, patch) =>
      updateBuilder((b) => ({ having: b.having.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),
    removeHavingCondition: (id) => updateBuilder((b) => ({ having: b.having.filter((c) => c.id !== id) })),

    toggleGroupByColumn: (column) =>
      updateBuilder((b) => {
        const groupBy = b.groupBy.includes(column) ? b.groupBy.filter((c) => c !== column) : [...b.groupBy, column]
        return { groupBy, groupByAggregate: groupBy.length === 0 ? null : b.groupByAggregate }
      }),
    setGroupByAggregate: (groupByAggregate) => updateBuilder(() => ({ groupByAggregate })),

    addOrderBy: () =>
      updateBuilder((b) => ({ orderBy: [...b.orderBy, { id: nextClauseId('order'), column: '', direction: 'ASC' }] })),
    updateOrderBy: (id, patch) =>
      updateBuilder((b) => ({ orderBy: b.orderBy.map((o) => (o.id === id ? { ...o, ...patch } : o)) })),
    removeOrderBy: (id) => updateBuilder((b) => ({ orderBy: b.orderBy.filter((o) => o.id !== id) })),

    setLimit: (limit) => updateBuilder(() => ({ limit })),

    setInsertValue: (column, value) =>
      updateBuilder((b) => ({ insertValues: { ...b.insertValues, [column]: value } })),
    setSetValue: (column, value) => updateBuilder((b) => ({ setValues: { ...b.setValues, [column]: value } })),

    setNewTableName: (newTableName) => updateBuilder(() => ({ newTableName })),
    addNewTableColumn: () =>
      updateBuilder((b) => ({
        newTableColumns: [
          ...b.newTableColumns,
          { id: nextClauseId('ddlcol'), name: '', type: 'TEXT', primaryKey: false, notNull: false },
        ],
      })),
    updateNewTableColumn: (id, patch) =>
      updateBuilder((b) => ({
        newTableColumns: b.newTableColumns.map((c) => (c.id === id ? { ...c, ...patch } : c)),
      })),
    removeNewTableColumn: (id) =>
      updateBuilder((b) => ({ newTableColumns: b.newTableColumns.filter((c) => c.id !== id) })),

    setAlterAction: (alterAction) => updateBuilder(() => ({ alterAction })),
    setAlterAddColumn: (alterAddColumn) => updateBuilder(() => ({ alterAddColumn })),
    setAlterRenameColumn: (alterRenameColumn) => updateBuilder(() => ({ alterRenameColumn })),
    setDropConfirmed: (dropConfirmed) => updateBuilder(() => ({ dropConfirmed })),
  }
})
