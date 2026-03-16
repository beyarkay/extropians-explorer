import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { formatDate } from '../utils/format'
import { messagePath } from '../utils/routes'
import Pagination from '../components/Pagination'

interface Domain {
  domain: string
  url_count: number
  message_count: number
}

interface DomainUrl {
  url: string
  snippet: string
  message_id: number
  from_name: string
  date: string
  subject: string
}

export default function Domains() {
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedDomain = searchParams.get('domain')
  const searchQuery = searchParams.get('q') || ''

  const [domains, setDomains] = useState<Domain[]>([])
  const [totalDomains, setTotalDomains] = useState(0)
  const [domainPage, setDomainPage] = useState(1)
  const [domainSearch, setDomainSearch] = useState(searchQuery)

  const [urls, setUrls] = useState<DomainUrl[]>([])
  const [totalUrls, setTotalUrls] = useState(0)
  const [urlPage, setUrlPage] = useState(1)

  // Fetch domains
  useEffect(() => {
    const params = new URLSearchParams()
    params.set('page', String(domainPage))
    params.set('per_page', '50')
    if (domainSearch) params.set('q', domainSearch)
    fetch(`/api/domains?${params}`).then(r => r.json()).then(data => {
      setDomains(data.domains)
      setTotalDomains(data.total)
    })
  }, [domainPage, domainSearch])

  // Fetch URLs for selected domain
  useEffect(() => {
    if (!selectedDomain) { setUrls([]); return }
    fetch(`/api/domain/${encodeURIComponent(selectedDomain)}?page=${urlPage}&per_page=20`)
      .then(r => r.json())
      .then(data => {
        setUrls(data.urls)
        setTotalUrls(data.total)
      })
  }, [selectedDomain, urlPage])

  useEffect(() => { setUrlPage(1) }, [selectedDomain])

  const domainTotalPages = Math.ceil(totalDomains / 50)
  const urlTotalPages = Math.ceil(totalUrls / 20)

  return (
    <>
      <div className="section-header">
        <h2>{totalDomains.toLocaleString()} domains, {selectedDomain ? `showing ${selectedDomain}` : 'sorted by link count'}</h2>
      </div>

      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        {/* Domain list (left panel) */}
        <div style={{ width: 340, flexShrink: 0 }}>
          <div className="filter-bar" style={{ marginBottom: 6 }}>
            <input
              type="text"
              placeholder="search domains..."
              value={domainSearch}
              onChange={e => { setDomainSearch(e.target.value); setDomainPage(1) }}
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {domains.map(d => (
              <div
                key={d.domain}
                onClick={() => { setSearchParams({ domain: d.domain }); setUrlPage(1) }}
                style={{
                  padding: '3px 6px',
                  borderBottom: '1px solid var(--border)',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  fontSize: 11,
                  background: d.domain === selectedDomain ? 'var(--bg-tertiary)' : 'transparent',
                }}
                onMouseEnter={e => { if (d.domain !== selectedDomain) e.currentTarget.style.background = 'var(--bg-secondary)' }}
                onMouseLeave={e => { if (d.domain !== selectedDomain) e.currentTarget.style.background = 'transparent' }}
              >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {d.domain}
                </span>
                <span style={{ color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', fontSize: 10, marginLeft: 8, flexShrink: 0 }}>
                  {d.url_count}
                </span>
              </div>
            ))}
          </div>

          <Pagination page={domainPage} totalPages={domainTotalPages} onPageChange={setDomainPage} />
        </div>

        {/* URL detail (right panel) */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {!selectedDomain ? (
            <div style={{ color: 'var(--text-tertiary)', padding: 24, textAlign: 'center', fontSize: 12 }}>
              Select a domain to see its URLs
            </div>
          ) : (
            <>
              <div className="section-header">
                <h2>{totalUrls} links from {selectedDomain}</h2>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {urls.map((u, i) => (
                  <div
                    key={i}
                    style={{
                      padding: '6px 8px',
                      borderBottom: '1px solid var(--border)',
                      fontSize: 11,
                    }}
                  >
                    <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', marginBottom: 2 }}>
                      <Link to={messagePath(u.message_id)} style={{ fontSize: 10, flexShrink: 0 }}>#</Link>
                      <span style={{ color: 'var(--accent)', fontSize: 10 }}>{u.from_name}</span>
                      <span style={{ color: 'var(--text-tertiary)', fontSize: 10 }}>{u.subject}</span>
                      <span style={{ color: 'var(--text-tertiary)', fontSize: 10, marginLeft: 'auto', flexShrink: 0 }}>
                        {formatDate(u.date)}
                      </span>
                    </div>
                    <div style={{
                      fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-secondary)',
                      lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-all',
                    }}>
                      {u.snippet}
                    </div>
                  </div>
                ))}
              </div>

              <Pagination page={urlPage} totalPages={urlTotalPages} onPageChange={setUrlPage} />
            </>
          )}
        </div>
      </div>
    </>
  )
}
