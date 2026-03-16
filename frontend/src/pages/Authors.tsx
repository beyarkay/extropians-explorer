import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { WIKIPEDIA_LINKS } from '../wikipedia'

interface Author {
  name: string
  post_count: number
  first_post: string
  last_post: string
}

export default function Authors() {
  const [authors, setAuthors] = useState<Author[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const navigate = useNavigate()
  const perPage = 100

  useEffect(() => {
    fetch(`/api/authors?page=${page}&per_page=${perPage}`)
      .then(r => r.json())
      .then(data => {
        setAuthors(data.authors)
        setTotal(data.total)
      })
  }, [page])

  const formatDate = (d: string | null) => {
    if (!d) return ''
    return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })
  }

  const totalPages = Math.ceil(total / perPage)

  return (
    <>
      <div className="section-header">
        <h2>Authors ({total.toLocaleString()})</h2>
      </div>

      <div className="author-list">
        {authors.map((a, i) => {
          const wiki = WIKIPEDIA_LINKS[a.name]
          return (
            <div
              key={a.name}
              className="author-item"
              onClick={() => navigate(`/author/${encodeURIComponent(a.name)}`)}
            >
              <span className="rank">{(page - 1) * perPage + i + 1}</span>
              <span className="name">
                {a.name}
                {wiki && (
                  <a
                    className="wiki-link"
                    href={wiki}
                    target="_blank"
                    rel="noopener"
                    onClick={e => e.stopPropagation()}
                    style={{ marginLeft: 8 }}
                  >
                    Wikipedia ↗
                  </a>
                )}
              </span>
              <span className="date-range">{formatDate(a.first_post)} – {formatDate(a.last_post)}</span>
              <span className="post-count">{a.post_count.toLocaleString()}</span>
            </div>
          )
        })}
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
