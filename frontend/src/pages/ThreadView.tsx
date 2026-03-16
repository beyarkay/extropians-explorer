import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'

interface Message {
  id: number
  message_id: string
  date: string
  from_name: string
  from_email: string
  subject: string
  body: string
  in_reply_to: string
}

export default function ThreadView() {
  const { threadId } = useParams<{ threadId: string }>()
  const [messages, setMessages] = useState<Message[]>([])
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const [votes, setVotes] = useState<Record<number, number>>({})

  useEffect(() => {
    if (threadId) {
      fetch(`/api/thread/${encodeURIComponent(threadId)}`)
        .then(r => r.json())
        .then((msgs: Message[]) => {
          setMessages(msgs)
          // Expand all by default if <= 10 messages, otherwise just the first
          if (msgs.length <= 10) {
            setExpanded(new Set(msgs.map(m => m.id)))
          } else if (msgs.length > 0) {
            setExpanded(new Set([msgs[0].id]))
          }
        })
    }
  }, [threadId])

  // Load votes from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('extropians-votes')
    if (stored) setVotes(JSON.parse(stored))
  }, [])

  const saveVotes = (newVotes: Record<number, number>) => {
    setVotes(newVotes)
    localStorage.setItem('extropians-votes', JSON.stringify(newVotes))
  }

  const vote = (id: number, delta: number) => {
    const current = votes[id] || 0
    // If clicking same direction, toggle off
    const newVal = current === delta ? 0 : delta
    saveVotes({ ...votes, [id]: newVal })
  }

  const toggleExpand = (id: number) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const expandAll = () => setExpanded(new Set(messages.map(m => m.id)))
  const collapseAll = () => setExpanded(new Set())

  const formatDate = (d: string | null) => {
    if (!d) return ''
    return new Date(d).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  }

  if (!messages.length) return <div className="loading">Loading thread...</div>

  const subject = messages[0]?.subject || '(no subject)'

  return (
    <>
      <Link to="/" className="back-link">← Back</Link>

      <div className="section-header">
        <h2 style={{ fontSize: 20 }}>{subject}</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={expandAll} style={{
            background: 'var(--bg-secondary)', border: '1px solid var(--border)',
            color: 'var(--text-secondary)', padding: '4px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 12,
          }}>Expand All</button>
          <button onClick={collapseAll} style={{
            background: 'var(--bg-secondary)', border: '1px solid var(--border)',
            color: 'var(--text-secondary)', padding: '4px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 12,
          }}>Collapse All</button>
        </div>
      </div>

      <div className="thread-view">
        {messages.map(m => {
          const voteVal = votes[m.id] || 0
          return (
            <div key={m.id} className="thread-message">
              <div className="msg-header" onClick={() => toggleExpand(m.id)}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, marginRight: 4 }}
                  onClick={e => e.stopPropagation()}>
                  <button
                    onClick={() => vote(m.id, 1)}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 14,
                      color: voteVal === 1 ? 'var(--green)' : 'var(--text-tertiary)',
                    }}
                    title="Upvote"
                  >▲</button>
                  <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: 11,
                    color: voteVal > 0 ? 'var(--green)' : voteVal < 0 ? 'var(--red)' : 'var(--text-tertiary)',
                  }}>{voteVal}</span>
                  <button
                    onClick={() => vote(m.id, -1)}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 14,
                      color: voteVal === -1 ? 'var(--red)' : 'var(--text-tertiary)',
                    }}
                    title="Downvote"
                  >▼</button>
                </div>
                <Link
                  to={`/author/${encodeURIComponent(m.from_name)}`}
                  className="author"
                  onClick={e => e.stopPropagation()}
                >
                  {m.from_name}
                </Link>
                <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>
                  {m.subject !== subject ? m.subject : ''}
                </span>
                <span className="date">{formatDate(m.date)}</span>
                <span style={{ color: 'var(--text-tertiary)', fontSize: 12, marginLeft: 8 }}>
                  {expanded.has(m.id) ? '▾' : '▸'}
                </span>
              </div>
              {expanded.has(m.id) && (
                <div className="msg-body">{m.body}</div>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}
