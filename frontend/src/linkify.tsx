import type { ReactNode } from 'react'

const URL_RE = /(https?:\/\/[^\s<>"{}|\\^`\[\]]+)/g

/** Format a date string as YYYYMMDD for Wayback Machine */
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

/** Linkify URLs within a single line, with optional Wayback Machine links */
function linkifyLine(text: string, messageDate?: string): ReactNode[] {
  const parts = text.split(URL_RE)
  return parts.map((part, i) =>
    URL_RE.test(part) ? (
      <span key={i} className="linked-url">
        <a href={part} target="_blank" rel="noopener noreferrer">{part}</a>
        <a
          href={`https://web.archive.org/web/${toWaybackDate(messageDate)}*/${part}`}
          target="_blank"
          rel="noopener noreferrer"
          className="wayback-link"
          title="View on Wayback Machine"
        >&#x1f4e6;</a>
      </span>
    ) : (
      part
    )
  )
}

/** Render message body with quoted lines styled and URLs as links */
export function renderBody(text: string, messageDate?: string): ReactNode[] {
  const lines = text.split('\n')
  const result: ReactNode[] = []
  let quoteBlock: string[] = []

  const flushQuote = () => {
    if (quoteBlock.length > 0) {
      result.push(
        <div key={`q-${result.length}`} className="quoted-text">
          {quoteBlock.map((line, i) => (
            <div key={i}>{linkifyLine(line, messageDate)}</div>
          ))}
        </div>
      )
      quoteBlock = []
    }
  }

  for (const line of lines) {
    if (line.trimStart().startsWith('>')) {
      quoteBlock.push(line)
    } else {
      flushQuote()
      result.push(<div key={`l-${result.length}`}>{linkifyLine(line, messageDate)}</div>)
    }
  }
  flushQuote()
  return result
}

export const linkify = renderBody
