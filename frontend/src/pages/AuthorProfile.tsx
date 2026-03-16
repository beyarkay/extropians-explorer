import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { WIKIPEDIA_LINKS } from '../wikipedia'
import { formatDate } from '../utils/format'
import ThreadList from '../components/ThreadList'
import ActivityChart from '../components/ActivityChart'

interface AuthorData {
  name: string
  post_count: number
  first_post: string
  last_post: string
  emails: string
  activity: { month: string; count: number }[]
}

export default function AuthorProfile() {
  const { name } = useParams<{ name: string }>()
  const [author, setAuthor] = useState<AuthorData | null>(null)

  useEffect(() => {
    if (name) {
      fetch(`/api/author/${encodeURIComponent(name)}`)
        .then(r => r.json())
        .then(setAuthor)
    }
  }, [name])

  if (!author) return <div className="loading">Loading...</div>

  const wiki = WIKIPEDIA_LINKS[author.name]

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

      <ActivityChart data={author.activity} height={160} title="activity" />

      <ThreadList author={name} defaultSort="date_desc" />
    </div>
  )
}
