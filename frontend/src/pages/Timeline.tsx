import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

interface TimelinePoint {
  month: string
  count: number
}

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

export default function Timeline() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [timeline, setTimeline] = useState<TimelinePoint[]>([])
  const [threads, setThreads] = useState<Thread[]>([])
  const [totalThreads, setTotalThreads] = useState(0)
  const [page, setPage] = useState(1)
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
    params.set('page', String(page))
    params.set('per_page', '50')
    fetch(`/api/threads?${params}`).then(r => r.json()).then(data => {
      setThreads(data.threads)
      setTotalThreads(data.total)
    })
  }, [selectedMonth, page])

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
    return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  const totalPages = Math.ceil(totalThreads / 50)

  return (
    <>
      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="label">Messages</div>
            <div className="value">{stats.total_messages.toLocaleString()}</div>
          </div>
          <div className="stat-card">
            <div className="label">Authors</div>
            <div className="value">{stats.unique_authors.toLocaleString()}</div>
          </div>
          <div className="stat-card">
            <div className="label">Threads</div>
            <div className="value">{stats.threads.toLocaleString()}</div>
          </div>
          <div className="stat-card">
            <div className="label">Active</div>
            <div className="value" style={{ fontSize: 18 }}>
              {stats.date_range.start} — {stats.date_range.end}
            </div>
          </div>
        </div>
      )}

      <div className="timeline-chart">
        <h2>
          Message Volume by Month
          {selectedMonth && (
            <span style={{ marginLeft: 12, color: 'var(--accent)', fontSize: 14 }}>
              Showing: {selectedMonth}
              <button
                onClick={() => { setSearchParams({}); setPage(1) }}
                style={{
                  marginLeft: 8, background: 'none', border: 'none',
                  color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: 14,
                }}
              >
                ✕ clear
              </button>
            </span>
          )}
        </h2>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={timeline} onClick={(e: any) => e?.activePayload && handleBarClick(e.activePayload[0].payload)}>
            <XAxis
              dataKey="month"
              tick={{ fill: '#6e7681', fontSize: 10 }}
              tickFormatter={(v: string) => {
                const [y, m] = v.split('-')
                return m === '01' ? y : ''
              }}
              interval={0}
            />
            <YAxis tick={{ fill: '#6e7681', fontSize: 11 }} width={45} />
            <Tooltip
              contentStyle={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 6 }}
              labelStyle={{ color: '#e6edf3' }}
              itemStyle={{ color: '#8b949e' }}
            />
            <Bar dataKey="count" radius={[2, 2, 0, 0]} cursor="pointer">
              {timeline.map((entry) => (
                <Cell
                  key={entry.month}
                  fill={entry.month === selectedMonth ? '#58a6ff' : '#30363d'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="section-header">
        <h2>
          {selectedMonth ? `Threads from ${selectedMonth}` : 'Recent Threads'}
          {' '}({totalThreads.toLocaleString()})
        </h2>
      </div>

      <div className="thread-list">
        {threads.map(t => (
          <div
            key={t.thread_id}
            className="thread-item"
            onClick={() => navigate(`/thread/${encodeURIComponent(t.thread_id)}`)}
          >
            <span className="subject">{t.subject || '(no subject)'}</span>
            <span className="meta">
              <span className="count">{t.message_count}</span>
              <span>{formatDate(t.first_date)}</span>
            </span>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
          <span className="page-info">Page {page} of {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
        </div>
      )}
    </>
  )
}
