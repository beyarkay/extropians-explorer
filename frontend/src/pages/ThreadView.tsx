import { useEffect, useState, useMemo } from 'react'
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
  tags: string[]
}

interface TreeNode {
  message: Message
  children: TreeNode[]
  depth: number
}

function buildTree(messages: Message[]): TreeNode[] {
  const byMsgId = new Map<string, Message>()
  for (const m of messages) byMsgId.set(m.message_id, m)

  const childrenOf = new Map<string, Message[]>()
  const roots: Message[] = []

  for (const m of messages) {
    if (m.in_reply_to && byMsgId.has(m.in_reply_to)) {
      const kids = childrenOf.get(m.in_reply_to) || []
      kids.push(m)
      childrenOf.set(m.in_reply_to, kids)
    } else {
      roots.push(m)
    }
  }

  function expand(msg: Message, depth: number): TreeNode {
    const kids = childrenOf.get(msg.message_id) || []
    return {
      message: msg,
      depth,
      children: kids.map(k => expand(k, depth + 1)),
    }
  }

  return roots.map(r => expand(r, 0))
}

function flattenTree(nodes: TreeNode[]): TreeNode[] {
  const result: TreeNode[] = []
  function walk(n: TreeNode) {
    result.push(n)
    for (const c of n.children) walk(c)
  }
  for (const n of nodes) walk(n)
  return result
}

export default function ThreadView() {
  const { threadId } = useParams<{ threadId: string }>()
  const [messages, setMessages] = useState<Message[]>([])
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set())
  const [votes, setVotes] = useState<Record<number, number>>({})

  useEffect(() => {
    if (threadId) {
      fetch(`/api/thread/${encodeURIComponent(threadId)}`)
        .then(r => r.json())
        .then(setMessages)
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
    setCollapsed(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const tree = useMemo(() => buildTree(messages), [messages])
  const flat = useMemo(() => flattenTree(tree), [tree])

  const formatDate = (d: string | null) => {
    if (!d) return ''
    return new Date(d).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    })
  }

  if (!messages.length) return <div className="loading">Loading...</div>

  const subject = messages[0]?.subject || '(no subject)'

  // Find which messages should be hidden because an ancestor is collapsed
  const hiddenIds = new Set<number>()
  function markHidden(nodes: TreeNode[]) {
    for (const n of nodes) {
      if (collapsed.has(n.message.id)) {
        // Hide all descendants
        function hideDescendants(node: TreeNode) {
          for (const c of node.children) {
            hiddenIds.add(c.message.id)
            hideDescendants(c)
          }
        }
        hideDescendants(n)
      }
      markHidden(n.children)
    }
  }
  markHidden(tree)

  const countDescendants = (nodes: TreeNode[]): number => {
    let count = 0
    for (const n of nodes) {
      count += 1 + countDescendants(n.children)
    }
    return count
  }

  // Find children count for a given message
  const childCountOf = (msgId: number): number => {
    function find(nodes: TreeNode[]): TreeNode | null {
      for (const n of nodes) {
        if (n.message.id === msgId) return n
        const found = find(n.children)
        if (found) return found
      }
      return null
    }
    const node = find(tree)
    return node ? countDescendants(node.children) : 0
  }

  return (
    <>
      <Link to="/" className="back-link">← back</Link>

      <div className="section-header">
        <h2 style={{ fontSize: 13, textTransform: 'none', letterSpacing: 0 }}>{subject}</h2>
        <div style={{ display: 'flex', gap: 4, fontSize: 10 }}>
          <span style={{ color: 'var(--text-tertiary)' }}>{messages.length} messages</span>
          {' | '}
          <a href="#" onClick={e => { e.preventDefault(); setCollapsed(new Set()) }}>expand all</a>
          {' | '}
          <a href="#" onClick={e => { e.preventDefault(); setCollapsed(new Set(messages.map(m => m.id))) }}>collapse all</a>
        </div>
      </div>

      <div className="thread-view">
        {flat.map(node => {
          const m = node.message
          if (hiddenIds.has(m.id)) return null
          const v = votes[m.id] || 0
          const isCollapsed = collapsed.has(m.id)
          const nChildren = childCountOf(m.id)

          return (
            <div key={m.id} className="thread-message" style={{ marginLeft: Math.min(node.depth * 16, 160) }}>
              <div className="msg-header" onClick={() => toggle(m.id)}>
                <span className="vote-controls" onClick={e => e.stopPropagation()}>
                  <button className={v === 1 ? 'upvoted' : ''} onClick={() => vote(m.id, 1)}>▲</button>
                  <span className="vote-score" style={{ color: v > 0 ? 'var(--green)' : v < 0 ? 'var(--red)' : undefined }}>{v}</span>
                  <button className={v === -1 ? 'downvoted' : ''} onClick={() => vote(m.id, -1)}>▼</button>
                </span>
                <span style={{ color: 'var(--text-tertiary)', fontSize: 10, cursor: 'pointer' }}>
                  {isCollapsed ? `[+${nChildren}]` : '[-]'}
                </span>
                <Link to={`/author/${encodeURIComponent(m.from_name)}`} className="author" onClick={e => e.stopPropagation()}>
                  {m.from_name}
                </Link>
                {m.subject !== subject && m.subject.replace(/^Re:\s*/i, '') !== subject.replace(/^Re:\s*/i, '') && (
                  <span style={{ color: 'var(--text-tertiary)', fontSize: 10 }}>{m.subject}</span>
                )}
                <span className="date">{formatDate(m.date)}</span>
                {m.tags.length > 0 && (
                  <span className="msg-tags" onClick={e => e.stopPropagation()}>
                    {m.tags.map(t => (
                      <Link key={t} to={`/?tag=${t}`} className="tag">{t}</Link>
                    ))}
                  </span>
                )}
                <Link
                  to={`/message/${m.id}`}
                  onClick={e => e.stopPropagation()}
                  style={{ color: 'var(--text-tertiary)', fontSize: 10 }}
                >#</Link>
              </div>
              {!isCollapsed && (
                <div className="msg-body" style={{ marginLeft: 28 }}>{linkify(m.body, m.date)}</div>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}
