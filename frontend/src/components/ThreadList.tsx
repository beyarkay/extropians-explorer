import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { tagColor, tagBg } from '../tagColors'
import { formatDateShort } from '../utils/format'
import { authorPath, threadPath } from '../utils/routes'
import Pagination from './Pagination'

interface Thread {
  thread_id: string
  subject: string
  message_count: number
  first_date: string
  last_date: string
  participants: string[]
  tags: string[]
}

type SortOption = 'replies' | 'date_desc' | 'date_asc' | 'recent_activity'

interface Props {
  author?: string
  participants?: string[]
  tag?: string | null
  month?: string | null
  hideSort?: boolean
  defaultSort?: SortOption
}

export default function ThreadList({ author, participants, tag, month, hideSort, defaultSort = 'replies' }: Props) {
  const [threads, setThreads] = useState<Thread[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [sort, setSort] = useState<SortOption>(defaultSort)
  const navigate = useNavigate()

  useEffect(() => { setPage(1) }, [author, tag, month, JSON.stringify(participants)])

  useEffect(() => {
    const params = new URLSearchParams()
    if (month) params.set('month', month)
    if (author) params.set('author', author)
    if (participants) for (const p of participants) params.append('participants', p)
    if (tag) params.set('tag', tag)
    params.set('sort', sort)
    params.set('page', String(page))
    params.set('per_page', '50')
    fetch(`/api/threads?${params}`).then(r => r.json()).then(data => {
      setThreads(data.threads)
      setTotal(data.total)
    })
  }, [author, tag, month, sort, page, JSON.stringify(participants)])

  const totalPages = Math.ceil(total / 50)

  return (
    <>
      {!hideSort && (
        <div className="section-header">
          <h2>{total.toLocaleString()} threads</h2>
          <div style={{ display: 'flex', gap: 4, fontSize: 10 }}>
            sort:
            {(['replies', 'date_desc', 'date_asc', 'recent_activity'] as SortOption[]).map(s => (
              <a
                key={s}
                href="#"
                onClick={e => { e.preventDefault(); setSort(s); setPage(1) }}
                style={{ color: sort === s ? 'var(--accent)' : 'var(--text-tertiary)', marginLeft: 4 }}
              >
                {s === 'replies' ? 'most replies' : s === 'date_desc' ? 'newest' : s === 'date_asc' ? 'oldest' : 'recent activity'}
              </a>
            ))}
          </div>
        </div>
      )}

      <div className="thread-list">
        {threads.map(t => {
          const firstAuthor = t.participants[0] || ''
          const nParticipants = t.participants.length
          return (
            <div
              key={t.thread_id}
              className="thread-item"
              onClick={() => navigate(threadPath(t.thread_id))}
            >
              <span className="count">{t.message_count}</span>
              <span className="subject">{t.subject || '(no subject)'}</span>
              {t.tags.length > 0 && (
                <span className="msg-tags" onClick={e => e.stopPropagation()}>
                  {t.tags.map(tg => (
                    <Link key={tg} to={`/?tag=${tg}`} className="tag" style={{ color: tagColor(tg), background: tagBg(tg) }}>{tg}</Link>
                  ))}
                </span>
              )}
              <span className="meta">
                <Link to={authorPath(firstAuthor)} className="author-name" onClick={e => e.stopPropagation()}>
                  {firstAuthor}
                </Link>
                {nParticipants > 1 && (
                  <span style={{ color: 'var(--text-tertiary)' }}>+{nParticipants - 1}</span>
                )}
                <span>{formatDateShort(t.first_date)}</span>
              </span>
            </div>
          )
        })}
      </div>

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </>
  )
}
