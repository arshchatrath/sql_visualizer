import { useDbStore } from '../../../../state/store'
import { availableColumns } from '../../../../lib/query/columns'
import { ConditionListBlock } from './ConditionListBlock'

export function WhereBlock() {
  const builder = useDbStore((s) => s.builder)
  const schema = useDbStore((s) => s.schema)
  const addWhereCondition = useDbStore((s) => s.addWhereCondition)
  const updateWhereCondition = useDbStore((s) => s.updateWhereCondition)
  const removeWhereCondition = useDbStore((s) => s.removeWhereCondition)

  // UPDATE/DELETE with no filter is allowed — nothing real is at stake in
  // this session-only database — but it means every row in the table, so
  // the empty state gets flagged rather than reading like a routine default.
  const isMutating = builder.mode === 'UPDATE' || builder.mode === 'DELETE'
  const verb = builder.mode === 'UPDATE' ? 'update' : 'delete'
  const emptyHint = isMutating
    ? `no conditions — this will ${verb} every row in ${builder.table ?? 'the table'}`
    : 'no conditions — matches every row'

  return (
    <ConditionListBlock
      label="WHERE"
      emptyHint={emptyHint}
      emptyHintTone={isMutating ? 'warn' : 'muted'}
      conditions={builder.where}
      columns={availableColumns(builder, schema)}
      onAdd={addWhereCondition}
      onUpdate={updateWhereCondition}
      onRemove={removeWhereCondition}
    />
  )
}
