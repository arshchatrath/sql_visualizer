import { GeneratedSql } from './GeneratedSql'
import { ExecuteButton } from './ExecuteButton'

export function QueryPanel() {
  return (
    <div className="flex h-full flex-col gap-3">
      <div className="min-h-0 flex-1">
        <GeneratedSql />
      </div>
      <ExecuteButton />
    </div>
  )
}
