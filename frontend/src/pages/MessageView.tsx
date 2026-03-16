import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { renderBody } from '../linkify'

interface MessageData {
  id: number
  message_id: string
  date: string
  from_name: string
  from_email: string
  subject: string
  body: string
  in_reply_to: string
  thread_id: string
  year_month: string
  prev_id: number | null
  next_id: number | null
  prev_in_thread_id: number | null
  next_in_thread_id: number | null
}

export default function MessageView() {
  const { id } = useParams<{ id: string }>()
  const [msg, setMsg] = useState<MessageData | null>(null)

  useEffect(() => {
    if (id) {
      fetch(`/api/message/${id}`).then(r => r.json()).then(setMsg)
    }
  }, [id])

  if (!msg) return <div className="loading">Loading...</div>

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', {
      weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })

  const NavLink = ({ to, label }: { to: number | null; label: string }) =>
    to ? <Link to={`/message/${to}`}>{label}</Link> : <span style={{ color: 'var(--text-tertiary)' }}>{label}</span>

  return (
    <div>
      {/* Navigation bar */}
      <div style={{
        display: 'flex', gap: 8, fontSize: 10, padding: '4px 0', marginBottom: 4,
        borderBottom: '1px solid var(--border)', flexWrap: 'wrap', alignItems: 'center',
      }}>
        <NavLink to={msg.prev_id} label="← prev msg" />
        <NavLink to={msg.next_id} label="next msg →" />
        <span style={{ color: 'var(--border)' }}>|</span>
        <NavLink to={msg.prev_in_thread_id} label="← prev in thread" />
        <NavLink to={msg.next_in_thread_id} label="next in thread →" />
        <span style={{ color: 'var(--border)' }}>|</span>
        <Link to={`/thread/${encodeURIComponent(msg.thread_id)}`}>full thread</Link>
        <span style={{ color: 'var(--border)' }}>|</span>
        <Link to={`/?month=${msg.year_month}`}>date index</Link>
        <Link to="/authors">author index</Link>
      </div>

      {/* Message header */}
      <div style={{
        background: 'var(--bg-secondary)', border: '1px solid var(--border)',
        borderRadius: 3, padding: '8px 12px', marginBottom: 4,
      }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{msg.subject}</div>
        <div style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'flex', gap: 12 }}>
          <span>
            From: <Link to={`/author/${encodeURIComponent(msg.from_name)}`}>{msg.from_name}</Link>
            {' '}<span style={{ color: 'var(--text-tertiary)' }}>({msg.from_email})</span>
          </span>
          <span>Date: {formatDate(msg.date)}</span>
        </div>
      </div>

      {/* Message body */}
      <div style={{
        background: 'var(--bg-secondary)', border: '1px solid var(--border)',
        borderRadius: 3, padding: '8px 12px',
        fontFamily: 'var(--font-mono)', fontSize: 11, lineHeight: 1.5,
      }}>
        {renderBody(msg.body, msg.date)}
      </div>

      {/* Bottom nav */}
      <div style={{
        display: 'flex', gap: 8, fontSize: 10, padding: '4px 0', marginTop: 4,
        borderTop: '1px solid var(--border)',
      }}>
        <NavLink to={msg.prev_id} label="← prev msg" />
        <NavLink to={msg.next_id} label="next msg →" />
        <span style={{ color: 'var(--border)' }}>|</span>
        <NavLink to={msg.prev_in_thread_id} label="← prev in thread" />
        <NavLink to={msg.next_in_thread_id} label="next in thread →" />
        <span style={{ color: 'var(--border)' }}>|</span>
        <Link to={`/thread/${encodeURIComponent(msg.thread_id)}`}>full thread</Link>
      </div>
    </div>
  )
}
