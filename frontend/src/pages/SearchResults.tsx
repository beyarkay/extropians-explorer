import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'

interface SearchResult {
  id: number
  date: string
  from_name: string
  subject: string
  thread_id: string
  snippet: string
}

export default function SearchResults() {
  const [searchParams] = useSearchParams()
  const query = searchParams.get('q') || ''
  const [results, setResults] = useState<SearchResult[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    if (query.length < 2) return
    setLoading(true)
    fetch(`/api/search?q=${encodeURIComponent(query)}&page=${page}&per_page=50`)
      .then(r => r.json())
      .then(data => {
        setResults(data.results)
        setTotal(data.total)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [query, page])

  // Reset page when query changes
  useEffect(() => { setPage(1) }, [query])

  const formatDate = (d: string | null) => {
    if (!d) return ''
    return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  const totalPages = Math.ceil(total / 50)

  if (loading) return <div className="loading">Searching...</div>

  return (
    <>
      <div className="section-header">
        <h2>
          Search: "{query}" — {total.toLocaleString()} results
        </h2>
      </div>

      <div className="thread-list search-results">
        {results.map(r => (
          <div
            key={r.id}
            className="thread-item result-item"
            onClick={() => navigate(`/thread/${encodeURIComponent(r.thread_id)}`)}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <span className="subject">{r.subject || '(no subject)'}</span>
              <div className="snippet" dangerouslySetInnerHTML={{ __html: r.snippet }} />
            </div>
            <span className="meta">
              <span style={{ color: 'var(--accent)' }}>{r.from_name}</span>
              <span>{formatDate(r.date)}</span>
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
