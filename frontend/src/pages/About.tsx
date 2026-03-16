import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

interface Stats {
  total_messages: number
  unique_authors: number
  threads: number
  date_range: { start: string; end: string }
}

export default function About() {
  const [stats, setStats] = useState<Stats | null>(null)
  useEffect(() => { fetch('/api/stats').then(r => r.json()).then(setStats) }, [])

  return (
    <div style={{ maxWidth: 700, lineHeight: 1.7, fontSize: 12 }}>
      <h2 style={{ fontSize: 16, marginBottom: 12 }}>About the Extropians Mailing List</h2>

      <p style={{ marginBottom: 12 }}>
        The <strong>Extropians mailing list</strong> (1996–2003) was one of the most intellectually
        significant online forums of the late 1990s and early 2000s. Run by the{' '}
        <a href="https://en.wikipedia.org/wiki/Extropy_Institute" target="_blank" rel="noopener">Extropy Institute</a>,
        it served as a hub for discussion of transhumanism, emerging technologies, artificial intelligence,
        cryptography, nanotechnology, life extension, libertarian philosophy, consciousness, and the
        long-term future of humanity.
      </p>

      <p style={{ marginBottom: 12 }}>
        The list attracted a remarkable concentration of people who would go on to shape major fields.
        Regular participants included:
      </p>

      <ul style={{ marginBottom: 12, paddingLeft: 20 }}>
        <li><Link to="/author/Eliezer Yudkowsky">Eliezer Yudkowsky</Link> — AI safety pioneer, founder of MIRI and LessWrong</li>
        <li><Link to="/author/Hal Finney">Hal Finney</Link> — cryptographer, received the first Bitcoin transaction</li>
        <li><Link to="/author/Robin Hanson">Robin Hanson</Link> — economist, prediction markets researcher, author of <em>The Age of Em</em></li>
        <li><Link to="/author/Anders Sandberg">Anders Sandberg</Link> — neuroscientist and transhumanist philosopher at FHI</li>
        <li><Link to="/author/Max More">Max More</Link> — philosopher, coined "extropy", led Alcor Life Extension Foundation</li>
        <li><Link to="/author/Damien Broderick">Damien Broderick</Link> — science fiction author, futurist</li>
        <li><Link to="/author/Lee Daniel Crocker">Lee Daniel Crocker</Link> — programmer, early Wikipedia contributor</li>
        <li><Link to="/author/Amara Graps">Amara Graps</Link> — planetary scientist at NASA/ESA</li>
        <li>Nick Szabo — cryptographer, inventor of "smart contracts" and Bit Gold</li>
        <li>Wei Dai — cryptographer, creator of b-money (precursor to Bitcoin)</li>
        <li>Nick Bostrom — philosopher, author of <em>Superintelligence</em>, founder of FHI</li>
      </ul>

      <p style={{ marginBottom: 12 }}>
        The discussions on this list presaged many of today's most pressing technological and philosophical
        debates — from AI alignment and existential risk, to cryptocurrency and decentralized systems,
        to the ethics of human enhancement. Reading through the archives is like watching the intellectual
        foundations of the 2020s being laid in real time, often by the very people who would later build on them.
      </p>

      <h2 style={{ fontSize: 16, marginBottom: 12, marginTop: 24 }}>About This Archive Explorer</h2>

      <p style={{ marginBottom: 12 }}>
        This site provides a searchable, browsable interface to the complete Extropians mailing list
        archive. The raw data comes from{' '}
        <a href="https://github.com/macterra/extropians" target="_blank" rel="noopener">macterra/extropians</a> on
        GitHub — 87 mbox files covering July 1996 to September 2003.
      </p>

      {stats && (
        <p style={{ marginBottom: 12 }}>
          The archive contains <strong>{stats.total_messages.toLocaleString()}</strong> messages
          from <strong>{stats.unique_authors.toLocaleString()}</strong> unique authors,
          organized into <strong>{stats.threads.toLocaleString()}</strong> conversation threads,
          spanning <strong>{stats.date_range.start}</strong> to <strong>{stats.date_range.end}</strong>.
        </p>
      )}

      <p style={{ marginBottom: 12 }}>Features:</p>
      <ul style={{ marginBottom: 12, paddingLeft: 20 }}>
        <li><strong>Timeline view</strong> — message volume over time, click any month to filter</li>
        <li><strong>Thread browser</strong> — sort by reply count, date, or recent activity</li>
        <li><strong>Participant filter</strong> — find threads where specific people talked to each other</li>
        <li><strong>Full-text search</strong> — FTS5 search across all message subjects and bodies</li>
        <li><strong>Author profiles</strong> — activity timelines and post history for each author</li>
        <li><strong>Message navigation</strong> — prev/next by date and within threads</li>
        <li><strong>Wayback Machine links</strong> — archived versions of URLs from the era</li>
        <li><strong>Wikipedia links</strong> — for notable participants</li>
      </ul>

      <p style={{ marginBottom: 12 }}>
        Another version of this archive is hosted by{' '}
        <a href="https://en.wikipedia.org/wiki/Wei_Dai" target="_blank" rel="noopener">Wei Dai</a> at{' '}
        <a href="http://extropians.weidai.com/" target="_blank" rel="noopener">extropians.weidai.com</a>.
      </p>

      <p style={{ color: 'var(--text-tertiary)', marginTop: 24, fontSize: 10 }}>
        Built with Python (FastAPI), SQLite (FTS5), React, and Recharts.
      </p>
    </div>
  )
}
