import { Routes, Route, NavLink, useNavigate } from 'react-router-dom'
import { useState, type FormEvent } from 'react'
import Timeline from './pages/Timeline'
import Authors from './pages/Authors'
import AuthorProfile from './pages/AuthorProfile'
import ThreadView from './pages/ThreadView'
import SearchResults from './pages/SearchResults'
import MessageView from './pages/MessageView'
import About from './pages/About'

function App() {
  const [searchQuery, setSearchQuery] = useState('')
  const navigate = useNavigate()

  const handleSearch = (e: FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim().length >= 2) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
    }
  }

  return (
    <div className="app-layout">
      <header className="app-header">
        <h1>Extropians</h1>
        <nav>
          <NavLink to="/" end>Timeline</NavLink>
          <NavLink to="/authors">Authors</NavLink>
          <NavLink to="/about">About</NavLink>
        </nav>
        <form className="search-box" onSubmit={handleSearch}>
          <span className="search-icon">&#x1F50D;</span>
          <input
            type="text"
            placeholder="Search messages..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </form>
      </header>
      <div className="main-content">
        <Routes>
          <Route path="/" element={<Timeline />} />
          <Route path="/authors" element={<Authors />} />
          <Route path="/author/:name" element={<AuthorProfile />} />
          <Route path="/thread/:threadId" element={<ThreadView />} />
          <Route path="/search" element={<SearchResults />} />
          <Route path="/message/:id" element={<MessageView />} />
          <Route path="/about" element={<About />} />
        </Routes>
      </div>
    </div>
  )
}

export default App
