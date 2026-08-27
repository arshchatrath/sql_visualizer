import { useDbStore } from '../../../../state/store'
import { availableColumns } from '../../../../lib/query/columns'
import { ConditionListBlock } from './ConditionListBlock'

export function HavingBlock() {
  const builder = useDbStore((s) => s.builder)
  const schema = useDbStore((s) => s.schema)
  const addHavingCondition = useDbStore((s) => s.addHavingCondition)
  const updateHavingCondition = useDbStore((s) => s.updateHavingCondition)
  const removeHavingCondition = useDbStore((s) => s.removeHavingCondition)

  if (builder.groupBy.length === 0) return null

  return (
    <ConditionListBlock
      label="HAVING"
      emptyHint="no conditions on the grouped rows"
      conditions={builder.having}
      columns={availableColumns(builder, schema)}
      onAdd={addHavingCondition}
      onUpdate={updateHavingCondition}
      onRemove={removeHavingCondition}
    />
  )
}
