import { useEffect, useState, useRef } from 'react'
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
  tags: string[]
}
interface AuthorSuggestion { name: string; post_count: number }
interface Tag { tag: string; count: number }

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

  // Participant filter
  const [participants, setParticipants] = useState<string[]>([])
  const [participantInput, setParticipantInput] = useState('')
  const [suggestions, setSuggestions] = useState<AuthorSuggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const suggestRef = useRef<HTMLDivElement>(null)

  // Tags
  const [allTags, setAllTags] = useState<Tag[]>([])
  const [selectedTag, setSelectedTag] = useState<string | null>(searchParams.get('tag'))

  useEffect(() => {
    fetch('/api/stats').then(r => r.json()).then(setStats)
    fetch('/api/timeline').then(r => r.json()).then(setTimeline)
    fetch('/api/tags').then(r => r.json()).then(setAllTags)
  }, [])

  useEffect(() => {
    const params = new URLSearchParams()
    if (selectedMonth) params.set('month', selectedMonth)
    params.set('sort', sort)
    params.set('page', String(page))
    params.set('per_page', '50')
    for (const p of participants) params.append('participants', p)
    if (selectedTag) params.set('tag', selectedTag)
    fetch(`/api/threads?${params}`).then(r => r.json()).then(data => {
      setThreads(data.threads)
      setTotalThreads(data.total)
    })
  }, [selectedMonth, sort, page, participants, selectedTag])

  // Autocomplete
  useEffect(() => {
    if (participantInput.length < 2) { setSuggestions([]); return }
    const timer = setTimeout(() => {
      fetch(`/api/authors/search?q=${encodeURIComponent(participantInput)}&limit=8`)
        .then(r => r.json())
        .then(setSuggestions)
    }, 150)
    return () => clearTimeout(timer)
  }, [participantInput])

  const addParticipant = (name: string) => {
    if (!participants.includes(name)) {
      setParticipants([...participants, name])
      setPage(1)
    }
    setParticipantInput('')
    setSuggestions([])
    setShowSuggestions(false)
  }

  const removeParticipant = (name: string) => {
    setParticipants(participants.filter(p => p !== name))
    setPage(1)
  }

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

      {/* Participant filter */}
      <div className="filter-bar">
        <div style={{ position: 'relative' }} ref={suggestRef}>
          <input
            type="text"
            placeholder="filter by participant..."
            value={participantInput}
            onChange={e => { setParticipantInput(e.target.value); setShowSuggestions(true) }}
            onFocus={() => setShowSuggestions(true)}
            onKeyDown={e => {
              if (e.key === 'Enter' && suggestions.length > 0) {
                e.preventDefault()
                addParticipant(suggestions[0].name)
              }
            }}
            style={{ width: 200 }}
          />
          {showSuggestions && suggestions.length > 0 && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, zIndex: 50,
              background: 'var(--bg-secondary)', border: '1px solid var(--border)',
              borderRadius: 3, maxHeight: 200, overflow: 'auto', width: 280,
            }}>
              {suggestions.map(s => (
                <div
                  key={s.name}
                  onClick={() => addParticipant(s.name)}
                  style={{
                    padding: '3px 8px', cursor: 'pointer', fontSize: 11,
                    display: 'flex', justifyContent: 'space-between',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-tertiary)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <span>{s.name}</span>
                  <span style={{ color: 'var(--text-tertiary)' }}>{s.post_count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        {participants.map(p => (
          <span key={p} style={{
            background: 'var(--bg-tertiary)', padding: '2px 8px', borderRadius: 3,
            fontSize: 11, display: 'flex', alignItems: 'center', gap: 4,
          }}>
            {p}
            <a href="#" onClick={e => { e.preventDefault(); removeParticipant(p) }}
              style={{ color: 'var(--text-tertiary)', fontSize: 10 }}>x</a>
          </span>
        ))}
        {/* Tag filter */}
        <span style={{ color: 'var(--text-tertiary)', fontSize: 10, marginLeft: 4 }}>topic:</span>
        <select
          value={selectedTag || ''}
          onChange={e => { setSelectedTag(e.target.value || null); setPage(1) }}
          style={{ width: 130 }}
        >
          <option value="">all topics</option>
          {allTags.map(t => (
            <option key={t.tag} value={t.tag}>{t.tag} ({t.count.toLocaleString()})</option>
          ))}
        </select>
        {selectedTag && (
          <a href="#" onClick={e => { e.preventDefault(); setSelectedTag(null); setPage(1) }}
            style={{ fontSize: 10 }}>[clear]</a>
        )}
      </div>

      <div className="section-header">
        <h2>
          {selectedMonth ? `threads from ${selectedMonth}` : 'threads'}
          {participants.length > 0 && ` with ${participants.join(' + ')}`}
          {selectedTag && ` tagged "${selectedTag}"`}
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
              {t.tags.length > 0 && (
                <span className="msg-tags" onClick={e => e.stopPropagation()}>
                  {t.tags.map(tag => (
                    <Link key={tag} to={`/?tag=${tag}`} className="tag">{tag}</Link>
                  ))}
                </span>
              )}
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
