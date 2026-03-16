import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { WIKIPEDIA_LINKS } from '../wikipedia'

interface AuthorData {
  name: string
  post_count: number
  first_post: string
  last_post: string
  emails: string
  activity: { month: string; count: number }[]
  messages: { id: number; date: string; subject: string; thread_id: string }[]
}

export default function AuthorProfile() {
  const { name } = useParams<{ name: string }>()
  const [author, setAuthor] = useState<AuthorData | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (name) {
      fetch(`/api/author/${encodeURIComponent(name)}`)
        .then(r => r.json())
        .then(setAuthor)
    }
  }, [name])

  if (!author) return <div className="loading">Loading...</div>

  const wiki = WIKIPEDIA_LINKS[author.name]

  const formatDate = (d: string | null) => {
    if (!d) return ''
    return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  return (
    <div className="author-profile">
      <Link to="/authors" className="back-link">← All Authors</Link>

      <div className="profile-header">
        <div>
          <h2>
            {author.name}
            {wiki && (
              <a href={wiki} target="_blank" rel="noopener" style={{ marginLeft: 12, fontSize: 14 }}>
                Wikipedia ↗
              </a>
            )}
          </h2>
          <div className="profile-stats">
            <span>{author.post_count.toLocaleString()} posts</span>
            <span>{formatDate(author.first_post)} – {formatDate(author.last_post)}</span>
          </div>
        </div>
      </div>

      <div className="timeline-chart">
        <h2>Activity Over Time</h2>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={author.activity}>
            <XAxis
              dataKey="month"
              tick={{ fill: '#6e7681', fontSize: 10 }}
              tickFormatter={(v: string) => {
                const [y, m] = v.split('-')
                return m === '01' ? y : ''
              }}
              interval={0}
            />
            <YAxis tick={{ fill: '#6e7681', fontSize: 11 }} width={35} />
            <Tooltip
              contentStyle={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 6 }}
              labelStyle={{ color: '#e6edf3' }}
              itemStyle={{ color: '#8b949e' }}
            />
            <Bar dataKey="count" fill="#58a6ff" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="section-header">
        <h2>Recent Messages (showing {Math.min(100, author.messages.length)})</h2>
      </div>

      <div className="thread-list">
        {author.messages.map(m => (
          <div
            key={m.id}
            className="thread-item"
            onClick={() => navigate(`/thread/${encodeURIComponent(m.thread_id)}`)}
          >
            <span className="subject">{m.subject || '(no subject)'}</span>
            <span className="meta">
              <span>{formatDate(m.date)}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
