import type { ComponentType } from 'react'
import { useDbStore } from '../../../state/store'
import { availableBlocks, type BlockKey } from '../../../lib/query/blocks'
import { ModeToggle } from './ModeToggle'
import { ScopeToggle } from './ScopeToggle'
import { TableSelector } from './TableSelector'
import { QueryChain } from './QueryChain'
import { WhereBlock } from './blocks/WhereBlock'
import { GroupByBlock } from './blocks/GroupByBlock'
import { HavingBlock } from './blocks/HavingBlock'
import { OrderByBlock } from './blocks/OrderByBlock'
import { LimitBlock } from './blocks/LimitBlock'
import { SetBlock } from './blocks/SetBlock'
import { InsertValuesBlock } from './blocks/InsertValuesBlock'
import { JoinBlock } from './blocks/JoinBlock'
import { CreateTableDdlBlock } from './blocks/CreateTableDdlBlock'
import { AlterTableDdlBlock } from './blocks/AlterTableDdlBlock'
import { DropTableDdlBlock } from './blocks/DropTableDdlBlock'

const BLOCK_COMPONENTS: Partial<Record<BlockKey, ComponentType>> = {
  join: JoinBlock,
  where: WhereBlock,
  groupBy: GroupByBlock,
  having: HavingBlock,
  orderBy: OrderByBlock,
  limit: LimitBlock,
  set: SetBlock,
  insertValues: InsertValuesBlock,
  createTableDdl: CreateTableDdlBlock,
  alterTableDdl: AlterTableDdlBlock,
  dropTableDdl: DropTableDdlBlock,
}

export function BuilderPanel() {
  const mode = useDbStore((s) => s.builder.mode)
  const scope = useDbStore((s) => s.builder.scope)
  const table = useDbStore((s) => s.builder.table)
  const blocks = availableBlocks(mode, scope)

  // CREATE + DATABASE builds a brand-new table from scratch — there's no
  // existing table to pick, so the table selector and its gate don't apply.
  const isNewTableDdl = scope === 'DATABASE' && mode === 'CREATE'
  const ready = isNewTableDdl || Boolean(table)

  return (
    <div className="flex h-full flex-col gap-4" data-testid="builder-panel">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <ModeToggle />
          <ScopeToggle />
        </div>
        {!isNewTableDdl && <TableSelector />}
      </div>

      <QueryChain />

      {ready ? (
        <div className="flex-1 space-y-4 border-t border-border pt-3">
          {blocks.map((key) => {
            const Block = BLOCK_COMPONENTS[key]
            if (!Block) return null
            return <Block key={key} />
          })}
        </div>
      ) : (
        <p className="text-xs text-muted">select a table above to see the blocks for this operation</p>
      )}
    </div>
  )
}
