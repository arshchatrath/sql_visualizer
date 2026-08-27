import { formatCellValue, computeColumnWidths, borderLine } from './tableLayout'

/**
 * Renders a box-drawing table from real content widths, computed at call
 * time — never hand-typed — so alignment can't break as data changes.
 */
export function renderAsciiTable(columns: string[], rows: unknown[][]): string {
  if (columns.length === 0) {
    return '(no columns)'
  }

  const textRows = rows.map((row) => row.map(formatCellValue))
  const widths = computeColumnWidths(columns, textRows)

  const dataRow = (cells: string[]) => '│ ' + cells.map((c, i) => c.padEnd(widths[i])).join(' │ ') + ' │'

  const lines = [
    borderLine(widths, '┌', '┬', '┐'),
    dataRow(columns),
    borderLine(widths, '├', '┼', '┤'),
    ...textRows.map(dataRow),
    borderLine(widths, '└', '┴', '┘'),
  ]

  return lines.join('\n')
}
