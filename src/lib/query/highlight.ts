const KEYWORDS = [
  'SELECT',
  'FROM',
  'WHERE',
  'JOIN',
  'ON',
  'GROUP BY',
  'ORDER BY',
  'HAVING',
  'LIMIT',
  'INSERT INTO',
  'VALUES',
  'UPDATE',
  'SET',
  'DELETE FROM',
  'AND',
  'OR',
  'AS',
  'ASC',
  'DESC',
  'COUNT',
  'SUM',
  'AVG',
  'MIN',
  'MAX',
  'LIKE',
]

const KEYWORD_PATTERN = new RegExp(
  `\\b(${[...KEYWORDS]
    .sort((a, b) => b.length - a.length)
    .map((k) => k.replace(/ /g, '\\s+'))
    .join('|')})\\b`,
  'gi',
)

export interface SqlToken {
  text: string
  keyword: boolean
}

/** Splits SQL text into keyword / plain segments for syntax-colored rendering. */
export function tokenizeSql(sql: string): SqlToken[] {
  if (!sql) return []
  const tokens: SqlToken[] = []
  let lastIndex = 0

  for (const match of sql.matchAll(KEYWORD_PATTERN)) {
    const idx = match.index ?? 0
    if (idx > lastIndex) tokens.push({ text: sql.slice(lastIndex, idx), keyword: false })
    tokens.push({ text: match[0], keyword: true })
    lastIndex = idx + match[0].length
  }
  if (lastIndex < sql.length) tokens.push({ text: sql.slice(lastIndex), keyword: false })

  return tokens
}
