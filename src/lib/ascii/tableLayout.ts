/** Shared by the plain-text ascii renderer and the animated results table, so column widths never disagree between the two. */
export function formatCellValue(value: unknown): string {
  return value === null || value === undefined ? 'NULL' : String(value)
}

export function computeColumnWidths(columns: string[], rows: string[][]): number[] {
  return columns.map((col, i) => Math.max(col.length, ...rows.map((row) => (row[i] ?? '').length), 1))
}

export function borderLine(widths: number[], left: string, mid: string, right: string): string {
  return left + widths.map((w) => '─'.repeat(w + 2)).join(mid) + right
}
