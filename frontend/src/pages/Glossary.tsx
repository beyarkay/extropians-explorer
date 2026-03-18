import { useState } from 'react'
import { GLOSSARY } from '../glossary'
import { tagColor, tagBg } from '../tagColors'
import { Link } from 'react-router-dom'
import { useTitle } from '../utils/useTitle'

const categories = [...new Set(GLOSSARY.map(e => e.category).filter(Boolean))] as string[]

export default function Glossary() {
  useTitle('Glossary')
  const [filter, setFilter] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const filtered = GLOSSARY
    .filter(e => !filter || e.category === filter)
    .filter(e => !search || e.term.toLowerCase().includes(search.toLowerCase())
      || e.definition.toLowerCase().includes(search.toLowerCase())
      || (e.aka || []).some(a => a.toLowerCase().includes(search.toLowerCase())))
    .sort((a, b) => a.term.localeCompare(b.term))

  return (
    <div style={{ maxWidth: 800 }}>
      <div className="section-header">
        <h2>glossary ({filtered.length} terms)</h2>
      </div>

      <div className="filter-bar" style={{ marginBottom: 8 }}>
        <input
          type="text"
          placeholder="search terms..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: 180 }}
        />
        <select
          value={filter || ''}
          onChange={e => setFilter(e.target.value || null)}
        >
          <option value="">all categories</option>
          {categories.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {filtered.map(entry => (
          <div
            key={entry.term}
            style={{
              padding: '6px 8px',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              gap: 12,
              alignItems: 'baseline',
              fontSize: 12,
            }}
          >
            <span style={{ fontWeight: 600, minWidth: 120, fontFamily: 'var(--font-mono)', fontSize: 11 }}>
              {entry.term}
              {entry.aka && entry.aka.length > 0 && (
                <span style={{ color: 'var(--text-tertiary)', fontWeight: 400, fontSize: 10, marginLeft: 4 }}>
                  ({entry.aka.join(', ')})
                </span>
              )}
            </span>
            <span style={{ flex: 1, color: 'var(--text-secondary)' }}>{entry.definition}</span>
            {entry.category && (
              <Link
                to={`/?tag=${entry.category}`}
                className="tag"
                style={{ color: tagColor(entry.category), background: tagBg(entry.category), flexShrink: 0 }}
              >
                {entry.category}
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
