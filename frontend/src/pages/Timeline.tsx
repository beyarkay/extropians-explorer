import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

interface TimelinePoint { month: string; count: number }
interface Stats {
  total_messages: number
  unique_authors: number
  threads: number
  date_range: { start: string; end: string }
}
interface Thread {
  thread_id: string
  subject: string
  message_count: number
  first_date: string
  last_date: string
  participants: string[]
}

type SortOption = 'replies' | 'date_desc' | 'date_asc' | 'recent_activity'

export default function Timeline() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [timeline, setTimeline] = useState<TimelinePoint[]>([])
  const [threads, setThreads] = useState<Thread[]>([])
  const [totalThreads, setTotalThreads] = useState(0)
  const [page, setPage] = useState(1)
  const [sort, setSort] = useState<SortOption>('replies')
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedMonth = searchParams.get('month')
  const navigate = useNavigate()

  useEffect(() => {
    fetch('/api/stats').then(r => r.json()).then(setStats)
    fetch('/api/timeline').then(r => r.json()).then(setTimeline)
  }, [])

  useEffect(() => {
    const params = new URLSearchParams()
    if (selectedMonth) params.set('month', selectedMonth)
    params.set('sort', sort)
    params.set('page', String(page))
    params.set('per_page', '50')
    fetch(`/api/threads?${params}`).then(r => r.json()).then(data => {
      setThreads(data.threads)
      setTotalThreads(data.total)
    })
  }, [selectedMonth, sort, page])

  const handleBarClick = (data: { month: string }) => {
    setPage(1)
    if (data.month === selectedMonth) {
      setSearchParams({})
    } else {
      setSearchParams({ month: data.month })
    }
  }

  const formatDate = (d: string | null) => {
    if (!d) return ''
    return new Date(d).toLocaleDateString('en-US', { year: '2-digit', month: 'short', day: 'numeric' })
  }

  const totalPages = Math.ceil(totalThreads / 50)

  return (
    <>
      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <span className="label">msgs</span>
            <span className="value">{stats.total_messages.toLocaleString()}</span>
          </div>
          <div className="stat-card">
            <span className="label">authors</span>
            <span className="value">{stats.unique_authors.toLocaleString()}</span>
          </div>
          <div className="stat-card">
            <span className="label">threads</span>
            <span className="value">{stats.threads.toLocaleString()}</span>
          </div>
          <div className="stat-card">
            <span className="label">range</span>
            <span className="value">{stats.date_range.start} – {stats.date_range.end}</span>
          </div>
        </div>
      )}

      <div className="timeline-chart">
        <h2>
          volume
          {selectedMonth && (
            <>
              {' '}— <span style={{ color: 'var(--accent)' }}>{selectedMonth}</span>
              {' '}
              <a href="#" onClick={e => { e.preventDefault(); setSearchParams({}); setPage(1) }}
                style={{ fontSize: 10 }}>[clear]</a>
            </>
          )}
        </h2>
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={timeline} onClick={(e: any) => e?.activePayload && handleBarClick(e.activePayload[0].payload)}>
            <XAxis
              dataKey="month"
              tick={{ fill: '#6e7681', fontSize: 9 }}
              tickFormatter={(v: string) => {
                const [y, m] = v.split('-')
                return m === '01' ? y : ''
              }}
              interval={0}
            />
            <YAxis tick={{ fill: '#6e7681', fontSize: 9 }} width={30} />
            <Tooltip
              contentStyle={{ background: '#141419', border: '1px solid #2a2a35', borderRadius: 3, fontSize: 11 }}
              labelStyle={{ color: '#e6edf3' }}
              itemStyle={{ color: '#8b949e' }}
            />
            <Bar dataKey="count" radius={[1, 1, 0, 0]} cursor="pointer">
              {timeline.map((entry) => (
                <Cell key={entry.month} fill={entry.month === selectedMonth ? '#58a6ff' : '#2a2a35'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="section-header">
        <h2>
          {selectedMonth ? `threads from ${selectedMonth}` : 'threads'}
          {' '}({totalThreads.toLocaleString()})
        </h2>
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

      <div className="thread-list">
        {threads.map(t => {
          const firstAuthor = t.participants[0] || ''
          const nParticipants = t.participants.length
          return (
            <div
              key={t.thread_id}
              className="thread-item"
              onClick={() => navigate(`/thread/${encodeURIComponent(t.thread_id)}`)}
            >
              <span className="count">{t.message_count}</span>
              <span className="subject">{t.subject || '(no subject)'}</span>
              <span className="meta">
                <Link
                  to={`/author/${encodeURIComponent(firstAuthor)}`}
                  className="author-name"
                  onClick={e => e.stopPropagation()}
                >
                  {firstAuthor}
                </Link>
                {nParticipants > 1 && (
                  <span style={{ color: 'var(--text-tertiary)' }}>+{nParticipants - 1}</span>
                )}
                <span>{formatDate(t.first_date)}</span>
              </span>
            </div>
          )
        })}
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← prev</button>
          <span className="page-info">{page}/{totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>next →</button>
        </div>
      )}
    </>
  )
}
