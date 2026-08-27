import { useLayoutEffect, useRef, useState } from 'react'
import { useDbStore } from '../../../state/store'

interface ConnectorPath {
  d: string
  labelX: number
  labelY: number
}

/**
 * Reads straight from the live, introspected schema in the store — never a
 * hand-maintained description — so it can't drift from what's actually in
 * the database. Draws a real connecting line between the two joined
 * tables whenever a JOIN is active, computed from the actual measured
 * position of each table's row (not guessed).
 */
export function SchemaTree() {
  const schema = useDbStore((s) => s.schema)
  const scope = useDbStore((s) => s.builder.scope)
  const primaryTable = useDbStore((s) => s.builder.table)
  const join = useDbStore((s) => s.builder.join)

  const setTable = useDbStore((s) => s.setTable)

  const containerRef = useRef<HTMLDivElement>(null)
  const rowRefs = useRef<Record<string, HTMLElement | null>>({})
  const [connector, setConnector] = useState<ConnectorPath | null>(null)

  const joinActive = scope === 'DATABASE' && Boolean(join.table)

  useLayoutEffect(() => {
    if (!joinActive || !primaryTable || !join.table) {
      setConnector(null)
      return
    }
    const container = containerRef.current
    const elA = rowRefs.current[primaryTable]
    const elB = rowRefs.current[join.table]
    if (!container || !elA || !elB) {
      setConnector(null)
      return
    }

    const containerRect = container.getBoundingClientRect()
    const rectA = elA.getBoundingClientRect()
    const rectB = elB.getBoundingClientRect()

    const anchorX = Math.max(rectA.right, rectB.right) - containerRect.left + 10
    const yA = rectA.top - containerRect.top + rectA.height / 2
    const yB = rectB.top - containerRect.top + rectB.height / 2
    const bulge = anchorX + 18

    setConnector({
      d: `M ${anchorX} ${yA} C ${bulge} ${yA}, ${bulge} ${yB}, ${anchorX} ${yB}`,
      labelX: bulge + 4,
      labelY: (yA + yB) / 2,
    })
  }, [joinActive, primaryTable, join.table, join.leftColumn, join.rightColumn, schema])

  if (schema.length === 0) {
    return <p className="text-xs text-muted">(no tables)</p>
  }

  return (
    <div ref={containerRef} className="relative pr-8" data-testid="schema-tree">
      {schema.map((table) => {
        const isJoinParty = joinActive && (table.name === primaryTable || table.name === join.table)
        const isSelected = table.name === primaryTable
        return (
          <div key={table.name} className="mb-4 last:mb-0">
            {/*
              A real button, not decorative text: the schema tree is where
              someone's eye already is when deciding what to query, so it's
              the most natural place to choose the table. Selecting here does
              exactly what the builder's own dropdown does.
            */}
            <button
              type="button"
              ref={(el) => {
                rowRefs.current[table.name] = el
              }}
              onClick={() => setTable(table.name)}
              data-focusable
              data-testid={`schema-table-${table.name}`}
              aria-pressed={isSelected}
              title={`build a query against ${table.name}`}
              className={`inline-block cursor-pointer text-left text-sm transition-colors hover:underline ${
                isJoinParty ? 'text-accent2' : 'text-accent'
              } ${isSelected ? 'underline' : ''}`}
            >
              {table.name}
            </button>
            <ul className="mt-1 ml-3 space-y-0.5 border-l border-border pl-3 text-xs">
              {table.columns.map((col) => (
                <li key={col.name} className="text-muted">
                  <span className="text-text">{col.name}</span> <span>{col.type.toLowerCase()}</span>
                  {col.primaryKey && <span className="text-accent2"> pk</span>}
                </li>
              ))}
            </ul>
          </div>
        )
      })}

      {connector && (
        <svg className="pointer-events-none absolute inset-0 overflow-visible" data-testid="schema-join-line">
          <path d={connector.d} fill="none" stroke="var(--color-accent2)" strokeWidth="1.5" />
          <text
            x={connector.labelX}
            y={connector.labelY}
            className="font-body text-[10px]"
            fill="var(--color-accent2)"
            dominantBaseline="middle"
          >
            ⋈
          </text>
        </svg>
      )}
    </div>
  )
}
