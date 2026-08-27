export interface WordmarkChar {
  ch: string
  isLetter: boolean
}

export interface WordmarkParts {
  top: string
  bottom: string
  /** The middle line's content, excluding its two │ border characters, one entry per column. */
  middleChars: WordmarkChar[]
}

/**
 * Computes the box-drawn wordmark's structure at render time from the real
 * content width — top/bottom border length and the middle row's character
 * positions (flagging which columns are actual letters vs spacing) both
 * fall out of `word`'s length, never hand-typed or hardcoded.
 */
export function buildWordmarkParts(word: string, pad = 4): WordmarkParts {
  const label = word.toUpperCase().split('').join(' ')
  const width = label.length + pad * 2
  const top = '┌' + '─'.repeat(width) + '┐'
  const bottom = '└' + '─'.repeat(width) + '┘'
  const middle = ' '.repeat(pad) + label + ' '.repeat(pad)
  const middleChars = middle.split('').map((ch) => ({ ch, isLetter: ch !== ' ' }))
  return { top, bottom, middleChars }
}

/** Flat 3-line string form, for contexts that just want the plain wordmark. */
export function buildWordmarkAscii(word: string, pad = 4): string {
  const { top, bottom, middleChars } = buildWordmarkParts(word, pad)
  const mid = '│' + middleChars.map((c) => c.ch).join('') + '│'
  return [top, mid, bottom].join('\n')
}
