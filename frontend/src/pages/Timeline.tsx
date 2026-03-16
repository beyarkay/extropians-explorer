import { useEffect, useState, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import ThreadList from '../components/ThreadList'
import ActivityChart from '../components/ActivityChart'

interface TimelinePoint { month: string; count: number }
interface Stats {
  total_messages: number
  unique_authors: number
  threads: number
  date_range: { start: string; end: string }
}
interface AuthorSuggestion { name: string; post_count: number }
interface Tag { tag: string; count: number }

export default function Timeline() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [timeline, setTimeline] = useState<TimelinePoint[]>([])
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedMonth = searchParams.get('month')

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
    fetch('/api/tags').then(r => r.json()).then(setAllTags)
  }, [])

  // Filtered stats and timeline
  useEffect(() => {
    const filterParams = new URLSearchParams()
    for (const p of participants) filterParams.append('participants', p)
    if (selectedTag) filterParams.set('tag', selectedTag)
    const qs = filterParams.toString()
    fetch(`/api/stats${qs ? '?' + qs : ''}`).then(r => r.json()).then(setStats)
    fetch(`/api/timeline${qs ? '?' + qs : ''}`).then(r => r.json()).then(setTimeline)
  }, [participants, selectedTag])

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
    if (!participants.includes(name)) setParticipants([...participants, name])
    setParticipantInput('')
    setSuggestions([])
    setShowSuggestions(false)
  }

  const removeParticipant = (name: string) => {
    setParticipants(participants.filter(p => p !== name))
  }

  const handleBarClick = (month: string) => {
    if (month === selectedMonth) {
      setSearchParams({})
    } else {
      setSearchParams({ month })
    }
  }

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

      <ActivityChart
        data={timeline}
        selectedMonth={selectedMonth}
        onBarClick={handleBarClick}
        title={selectedMonth
          ? `volume — ${selectedMonth} `
          : 'volume'
        }
      />
      {selectedMonth && (
        <a href="#" onClick={e => { e.preventDefault(); setSearchParams({}) }}
          style={{ fontSize: 10, marginTop: -6, display: 'inline-block' }}>[clear month filter]</a>
      )}

      {/* Filters */}
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
        <span style={{ color: 'var(--text-tertiary)', fontSize: 10, marginLeft: 4 }}>topic:</span>
        <select
          value={selectedTag || ''}
          onChange={e => { setSelectedTag(e.target.value || null) }}
          style={{ width: 130 }}
        >
          <option value="">all topics</option>
          {allTags.map(t => (
            <option key={t.tag} value={t.tag}>{t.tag} ({t.count.toLocaleString()})</option>
          ))}
        </select>
        {selectedTag && (
          <a href="#" onClick={e => { e.preventDefault(); setSelectedTag(null) }}
            style={{ fontSize: 10 }}>[clear]</a>
        )}
      </div>

      <ThreadList
        month={selectedMonth}
        participants={participants}
        tag={selectedTag}
      />
    </>
  )
}
