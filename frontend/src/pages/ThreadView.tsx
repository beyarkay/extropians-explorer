import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { linkify } from '../linkify'

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
          if (msgs.length <= 15) {
            setExpanded(new Set(msgs.map(m => m.id)))
          } else if (msgs.length > 0) {
            setExpanded(new Set([msgs[0].id]))
          }
        })
    }
  }, [threadId])

  useEffect(() => {
    const stored = localStorage.getItem('extropians-votes')
    if (stored) setVotes(JSON.parse(stored))
  }, [])

  const saveVotes = (v: Record<number, number>) => {
    setVotes(v)
    localStorage.setItem('extropians-votes', JSON.stringify(v))
  }

  const vote = (id: number, delta: number) => {
    const cur = votes[id] || 0
    saveVotes({ ...votes, [id]: cur === delta ? 0 : delta })
  }

  const toggle = (id: number) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const formatDate = (d: string | null) => {
    if (!d) return ''
    return new Date(d).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    })
  }

  if (!messages.length) return <div className="loading">Loading...</div>

  const subject = messages[0]?.subject || '(no subject)'

  return (
    <>
      <Link to="/" className="back-link">← back</Link>

      <div className="section-header">
        <h2 style={{ fontSize: 13, textTransform: 'none', letterSpacing: 0 }}>{subject}</h2>
        <div style={{ display: 'flex', gap: 4, fontSize: 10 }}>
          <span style={{ color: 'var(--text-tertiary)' }}>{messages.length} messages</span>
          {' | '}
          <a href="#" onClick={e => { e.preventDefault(); setExpanded(new Set(messages.map(m => m.id))) }}>expand all</a>
          {' | '}
          <a href="#" onClick={e => { e.preventDefault(); setExpanded(new Set()) }}>collapse all</a>
        </div>
      </div>

      <div className="thread-view">
        {messages.map(m => {
          const v = votes[m.id] || 0
          return (
            <div key={m.id} className="thread-message">
              <div className="msg-header" onClick={() => toggle(m.id)}>
                <span className="vote-controls" onClick={e => e.stopPropagation()}>
                  <button className={v === 1 ? 'upvoted' : ''} onClick={() => vote(m.id, 1)}>▲</button>
                  <span className="vote-score" style={{ color: v > 0 ? 'var(--green)' : v < 0 ? 'var(--red)' : undefined }}>{v}</span>
                  <button className={v === -1 ? 'downvoted' : ''} onClick={() => vote(m.id, -1)}>▼</button>
                </span>
                <Link to={`/author/${encodeURIComponent(m.from_name)}`} className="author" onClick={e => e.stopPropagation()}>
                  {m.from_name}
                </Link>
                {m.subject !== subject && (
                  <span style={{ color: 'var(--text-tertiary)', fontSize: 10 }}>{m.subject}</span>
                )}
                <span className="date">{formatDate(m.date)}</span>
                <span style={{ color: 'var(--text-tertiary)', fontSize: 10 }}>
                  {expanded.has(m.id) ? '[-]' : '[+]'}
                </span>
              </div>
              {expanded.has(m.id) && (
                <div className="msg-body">{linkify(m.body)}</div>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}
