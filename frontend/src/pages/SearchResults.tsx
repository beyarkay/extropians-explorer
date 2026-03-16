import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { formatDate } from '../utils/format'
import { threadPath } from '../utils/routes'
import Pagination from '../components/Pagination'

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

  useEffect(() => { setPage(1) }, [query])

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
            onClick={() => navigate(threadPath(r.thread_id))}
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

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </>
  )
}
