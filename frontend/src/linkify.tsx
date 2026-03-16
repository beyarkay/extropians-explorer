import type { ReactNode } from 'react'

const URL_RE = /(https?:\/\/[^\s<>"{}|\\^`\[\]]+)/g

/** Turn plain text into React nodes with clickable links */
export function linkify(text: string): ReactNode[] {
  const parts = text.split(URL_RE)
  return parts.map((part, i) =>
    URL_RE.test(part) ? (
      <a key={i} href={part} target="_blank" rel="noopener noreferrer">{part}</a>
    ) : (
      part
    )
  )
}
