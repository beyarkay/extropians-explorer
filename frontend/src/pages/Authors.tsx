import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { WIKIPEDIA_LINKS } from '../wikipedia'
import { formatDateMonthOnly } from '../utils/format'
import { authorPath } from '../utils/routes'
import Pagination from '../components/Pagination'

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
              onClick={() => navigate(authorPath(a.name))}
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
              <span className="date-range">{formatDateMonthOnly(a.first_post)} – {formatDateMonthOnly(a.last_post)}</span>
              <span className="post-count">{a.post_count.toLocaleString()}</span>
            </div>
          )
        })}
      </div>

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </>
  )
}
