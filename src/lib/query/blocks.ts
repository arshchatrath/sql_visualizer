import type { CrudMode, Scope } from './types'

export type BlockKey =
  | 'insertValues'
  | 'where'
  | 'groupBy'
  | 'having'
  | 'orderBy'
  | 'limit'
  | 'set'
  | 'join'
  | 'createTableDdl'
  | 'alterTableDdl'
  | 'dropTableDdl'

/**
 * The CRUD-mode × scope model from the spec: which building blocks appear
 * underneath the two toggles.
 */
export function availableBlocks(mode: CrudMode, scope: Scope): BlockKey[] {
  if (scope === 'TABLE') {
    switch (mode) {
      case 'CREATE':
        return ['insertValues']
      case 'READ':
        return ['where', 'groupBy', 'having', 'orderBy', 'limit']
      case 'UPDATE':
        return ['set', 'where']
      case 'DELETE':
        return ['where']
    }
  }

  // DATABASE scope: READ gets a JOIN across tables; CREATE/UPDATE/DELETE
  // become schema DDL (create/alter/drop a table) rather than row CRUD.
  switch (mode) {
    case 'READ':
      return ['join', 'where', 'groupBy', 'having', 'orderBy', 'limit']
    case 'CREATE':
      return ['createTableDdl']
    case 'UPDATE':
      return ['alterTableDdl']
    case 'DELETE':
      return ['dropTableDdl']
  }
}
