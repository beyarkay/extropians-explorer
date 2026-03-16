import type { ReactNode } from 'react'

const URL_RE = /(https?:\/\/[^\s<>"{}|\\^`\[\]]+)/g

/** Linkify URLs within a single line */
function linkifyLine(text: string): ReactNode[] {
  const parts = text.split(URL_RE)
  return parts.map((part, i) =>
    URL_RE.test(part) ? (
      <a key={i} href={part} target="_blank" rel="noopener noreferrer">{part}</a>
    ) : (
      part
    )
  )
}

/** Render message body with quoted lines styled and URLs as links */
export function renderBody(text: string): ReactNode[] {
  const lines = text.split('\n')
  const result: ReactNode[] = []
  let quoteBlock: string[] = []

  const flushQuote = () => {
    if (quoteBlock.length > 0) {
      result.push(
        <div key={`q-${result.length}`} className="quoted-text">
          {quoteBlock.map((line, i) => (
            <div key={i}>{linkifyLine(line)}</div>
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
      result.push(<div key={`l-${result.length}`}>{linkifyLine(line)}</div>)
    }
  }
  flushQuote()
  return result
}

// Keep backward compat
export const linkify = renderBody
