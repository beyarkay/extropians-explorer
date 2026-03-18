import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { renderBody } from '../linkify'
import { formatDateFull } from '../utils/format'
import { authorPath, threadPath, messagePath } from '../utils/routes'
import { useTitle } from '../utils/useTitle'

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

  useTitle(msg?.subject || 'Message')

  useEffect(() => {
    if (id) {
      fetch(`/api/message/${id}`).then(r => r.json()).then(setMsg)
    }
  }, [id])

  if (!msg) return <div className="loading">Loading...</div>

  const NavLink = ({ to, label }: { to: number | null; label: string }) =>
    to ? <Link to={messagePath(to)}>{label}</Link> : <span style={{ color: 'var(--text-tertiary)' }}>{label}</span>

  const navBar = (
    <div style={{
      display: 'flex', gap: 8, fontSize: 10, padding: '4px 0',
      borderBottom: '1px solid var(--border)', flexWrap: 'wrap', alignItems: 'center',
    }}>
      <NavLink to={msg.prev_id} label="← prev msg" />
      <NavLink to={msg.next_id} label="next msg →" />
      <span style={{ color: 'var(--border)' }}>|</span>
      <NavLink to={msg.prev_in_thread_id} label="← prev in thread" />
      <NavLink to={msg.next_in_thread_id} label="next in thread →" />
      <span style={{ color: 'var(--border)' }}>|</span>
      <Link to={threadPath(msg.thread_id)}>full thread</Link>
      <span style={{ color: 'var(--border)' }}>|</span>
      <Link to={`/?month=${msg.year_month}`}>date index</Link>
      <Link to="/authors">author index</Link>
    </div>
  )

  return (
    <div>
      {navBar}

      <div style={{
        background: 'var(--bg-secondary)', border: '1px solid var(--border)',
        borderRadius: 3, padding: '8px 12px', marginTop: 4, marginBottom: 4,
      }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{msg.subject}</div>
        <div style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'flex', gap: 12 }}>
          <span>
            From: <Link to={authorPath(msg.from_name)}>{msg.from_name}</Link>
            {' '}<span style={{ color: 'var(--text-tertiary)' }}>({msg.from_email})</span>
          </span>
          <span>Date: {formatDateFull(msg.date)}</span>
        </div>
      </div>

      <div style={{
        background: 'var(--bg-secondary)', border: '1px solid var(--border)',
        borderRadius: 3, padding: '8px 12px',
        fontFamily: 'var(--font-mono)', fontSize: 11, lineHeight: 1.5,
      }}>
        {renderBody(msg.body, msg.date)}
      </div>

      <div style={{ borderTop: '1px solid var(--border)', marginTop: 4 }}>
        {navBar}
      </div>
    </div>
  )
}
