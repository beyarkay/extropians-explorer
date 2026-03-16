import type { ReactNode } from 'react'
import { GLOSSARY_RE, lookupTerm } from './glossary'

const URL_RE = /(https?:\/\/[^\s<>"{}|\\^`\[\]]+)/g

function toWaybackDate(dateStr: string | undefined): string {
  if (!dateStr) return '20000101'
  try {
    const d = new Date(dateStr)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}${m}${day}`
  } catch {
    return '20000101'
  }
}

/** Annotate glossary terms in a plain text string */
function annotateGlossary(text: string, keyPrefix: string): ReactNode[] {
  const result: ReactNode[] = []
  let lastIndex = 0
  // Reset regex state
  GLOSSARY_RE.lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = GLOSSARY_RE.exec(text)) !== null) {
    const before = text.slice(lastIndex, match.index)
    if (before) result.push(before)
    const term = match[0]
    const entry = lookupTerm(term)
    if (entry) {
      result.push(
        <span key={`${keyPrefix}-g${match.index}`} className="glossary-term" title={entry.definition}>
          {term}
        </span>
      )
    } else {
      result.push(term)
    }
    lastIndex = match.index + match[0].length
  }
  const remaining = text.slice(lastIndex)
  if (remaining) result.push(remaining)
  return result
}

/** Process a single line: linkify URLs, then annotate glossary terms in non-URL parts */
function processLine(text: string, messageDate?: string): ReactNode[] {
  const urlParts = text.split(URL_RE)
  const result: ReactNode[] = []
  urlParts.forEach((part, i) => {
    if (URL_RE.test(part)) {
      result.push(
        <span key={`u${i}`} className="linked-url">
          <a href={part} target="_blank" rel="noopener noreferrer">{part}</a>
          <a
            href={`https://web.archive.org/web/${toWaybackDate(messageDate)}*/${part}`}
            target="_blank"
            rel="noopener noreferrer"
            className="wayback-link"
            title="View on Wayback Machine"
          >&#x1f4e6;</a>
        </span>
      )
    } else {
      result.push(...annotateGlossary(part, `t${i}`))
    }
  })
  return result
}

/** Render message body with quoted lines, URLs as links, and glossary tooltips */
export function renderBody(text: string, messageDate?: string): ReactNode[] {
  const lines = text.split('\n')
  const result: ReactNode[] = []
  let quoteBlock: string[] = []

  const flushQuote = () => {
    if (quoteBlock.length > 0) {
      result.push(
        <div key={`q-${result.length}`} className="quoted-text">
          {quoteBlock.map((line, i) => (
            <div key={i}>{processLine(line, messageDate)}</div>
          ))}
        </div>
      )
      quoteBlock = []
    }
  }

  for (const line of lines) {
    if (line.trimStart().startsWith('>')) {
      quoteBlock.push(line.replace(/^(\s*>)+\s?/, ''))
    } else {
      flushQuote()
      result.push(<div key={`l-${result.length}`}>{processLine(line, messageDate)}</div>)
    }
  }
  flushQuote()
  return result
}

export const linkify = renderBody
