import { useEffect, useState, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { linkify } from '../linkify'
import { tagColor, tagBg } from '../tagColors'
import { formatDateWithTime } from '../utils/format'
import { authorPath, messagePath } from '../utils/routes'

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
  if (messages.length === 0) return []

  const byMsgId = new Map<string, Message>()
  for (const m of messages) byMsgId.set(m.message_id, m)

  const childrenOf = new Map<string, Message[]>()

  // Find the root: prefer messages that no other message replies to,
  // or messages without "Re:" in subject, falling back to first chronologically
  const candidates = messages.filter(m => !m.in_reply_to || !byMsgId.has(m.in_reply_to))
  const root = candidates.find(m => !m.subject.match(/^re:/i))
    || candidates[0]
    || messages[0]

  const assignedAsChild = new Set<number>()

  // First pass: link messages with explicit in_reply_to
  for (const m of messages) {
    if (m.id === root.id) continue
    if (m.in_reply_to && byMsgId.has(m.in_reply_to)) {
      const kids = childrenOf.get(m.in_reply_to) || []
      kids.push(m)
      childrenOf.set(m.in_reply_to, kids)
      assignedAsChild.add(m.id)
    }
  }

  // Second pass: orphan messages (no valid in_reply_to) become children
  // of the root. This handles the common case where old email clients
  // didn't set In-Reply-To headers.
  for (const m of messages) {
    if (m.id === root.id) continue
    if (!assignedAsChild.has(m.id)) {
      const kids = childrenOf.get(root.message_id) || []
      kids.push(m)
      childrenOf.set(root.message_id, kids)
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

  return [expand(root, 0)]
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

  const formatDate = formatDateWithTime

  if (!messages.length) return <div className="loading">Loading...</div>

  // Use the tree root's subject as the thread title
  const rootSubject = tree[0]?.message.subject || messages[0]?.subject || '(no subject)'
  // Strip "Re: " for the canonical thread title
  const threadTitle = rootSubject.replace(/^Re:\s*/i, '')

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
        <h2 style={{ fontSize: 13, textTransform: 'none', letterSpacing: 0 }}>{threadTitle}</h2>
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
                <Link to={authorPath(m.from_name)} className="author" onClick={e => e.stopPropagation()}>
                  {m.from_name}
                </Link>
                <span style={{ color: 'var(--text-secondary)', fontSize: 10, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {m.subject || '(no subject)'}
                </span>
                <span className="date">{formatDate(m.date)}</span>
                {m.tags.length > 0 && (
                  <span className="msg-tags" onClick={e => e.stopPropagation()}>
                    {m.tags.map(t => (
                      <Link key={t} to={`/?tag=${t}`} className="tag" style={{ color: tagColor(t), background: tagBg(t) }}>{t}</Link>
                    ))}
                  </span>
                )}
                <Link
                  to={messagePath(m.id)}
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
