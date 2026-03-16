import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

interface Stats {
  total_messages: number
  unique_authors: number
  threads: number
  date_range: { start: string; end: string }
}

const P = ({ children }: { children: React.ReactNode }) => (
  <p style={{ marginBottom: 12 }}>{children}</p>
)

export default function About() {
  const [stats, setStats] = useState<Stats | null>(null)
  useEffect(() => { fetch('/api/stats').then(r => r.json()).then(setStats) }, [])

  return (
    <div style={{ maxWidth: 700, lineHeight: 1.7, fontSize: 12 }}>
      <h2 style={{ fontSize: 16, marginBottom: 12 }}>The Extropians Mailing List</h2>

      <P>
        The <strong>Extropians mailing list</strong> (1996–2003) was one of the most intellectually
        significant online forums of the late 1990s and early 2000s. Run by the{' '}
        <a href="https://en.wikipedia.org/wiki/Extropy_Institute" target="_blank" rel="noopener">Extropy Institute</a>,
        it served as a hub for discussion of transhumanism, emerging technologies, artificial intelligence,
        cryptography, nanotechnology, life extension, libertarian philosophy, consciousness, and the
        long-term future of humanity.
      </P>

      <h3 style={{ fontSize: 14, marginBottom: 8, marginTop: 20 }}>Context: Mailing Lists in the Late 1990s</h3>

      <P>
        To understand these archives, it helps to understand the medium. In the late 1990s and early 2000s,
        before Reddit, Twitter, Discord, or even widespread use of web forums, <strong>mailing lists</strong> were
        one of the primary venues for serious intellectual discussion online. They worked like a shared
        email inbox: you subscribed to a list address, and every message sent to that address was delivered
        to every subscriber's email. Replies went back to the whole list.
      </P>

      <P>
        Messages tended to be long and detailed. The convention of <strong>inline quoting</strong> (prefixing
        quoted text with <code>&gt;</code> characters) allowed for point-by-point responses, where a
        reply would interleave new text with excerpts of the original message. This format encouraged
        structured, multi-part arguments rather than short reactions.
      </P>

      <P>
        Conversations typically unfolded over days or weeks. A single thread might contain thousands of
        words across dozens of replies, covering topics like the feasibility
        of <Link to="/?tag=nanotech">molecular nanotechnology</Link> or
        the probability of <Link to="/?tag=ai">artificial general intelligence</Link>. The list
        also saw frequent flame wars and personality clashes.
      </P>

      <P>
        The list's social norms included an emphasis on free speech and open debate, willingness to
        engage with unconventional ideas, and an expectation that claims would be supported with reasoning
        or evidence. List members frequently disagreed, sometimes acrimoniously.
      </P>

      <P>
        Many topics discussed on the list preceded their entry into mainstream discourse.
        Participants debated <Link to="/?tag=ai">AI alignment</Link> in 1999,
        discussed <Link to="/?tag=crypto">digital currency</Link> in 1998,
        and argued about <Link to="/?tag=biology">genetic enhancement</Link> in 1997.
        Other recurring topics
        included <Link to="/?tag=cryonics">cryonics</Link>, <Link to="/?tag=space">space
        colonization</Link>, <Link to="/?tag=consciousness">consciousness and uploading</Link>,
        {' '}<Link to="/?tag=economics">libertarian economics</Link>,
        and <Link to="/?tag=philosophy">existential risk</Link>.
      </P>

      <h3 style={{ fontSize: 14, marginBottom: 8, marginTop: 20 }}>Notable Participants</h3>

      <P>
        Several participants went on to become prominent in their fields:
      </P>

      <ul style={{ marginBottom: 12, paddingLeft: 20 }}>
        <li>
          <Link to="/author/Eliezer Yudkowsky">Eliezer Yudkowsky</Link>{' '}
          (<a href="https://en.wikipedia.org/wiki/Eliezer_Yudkowsky" target="_blank" rel="noopener">Wikipedia</a>)
          — AI safety pioneer, founder of MIRI and LessWrong
        </li>
        <li>
          <Link to="/author/Hal Finney">Hal Finney</Link>{' '}
          (<a href="https://en.wikipedia.org/wiki/Hal_Finney_(computer_scientist)" target="_blank" rel="noopener">Wikipedia</a>)
          — cryptographer, received the first Bitcoin transaction
        </li>
        <li>
          <Link to="/author/Robin Hanson">Robin Hanson</Link>{' '}
          (<a href="https://en.wikipedia.org/wiki/Robin_Hanson" target="_blank" rel="noopener">Wikipedia</a>)
          — economist, prediction markets researcher, author of <em>The Age of Em</em>
        </li>
        <li>
          <Link to="/author/Anders Sandberg">Anders Sandberg</Link>{' '}
          (<a href="https://en.wikipedia.org/wiki/Anders_Sandberg" target="_blank" rel="noopener">Wikipedia</a>)
          — neuroscientist and transhumanist philosopher at FHI
        </li>
        <li>
          <Link to="/author/Max More">Max More</Link>{' '}
          (<a href="https://en.wikipedia.org/wiki/Max_More" target="_blank" rel="noopener">Wikipedia</a>)
          — philosopher, coined "extropy", led Alcor Life Extension Foundation
        </li>
        <li>
          <Link to="/author/Nick Bostrom">Nick Bostrom</Link>{' '}
          (<a href="https://en.wikipedia.org/wiki/Nick_Bostrom" target="_blank" rel="noopener">Wikipedia</a>)
          — philosopher, author of <em>Superintelligence</em>, founder of FHI
        </li>
        <li>
          <Link to="/author/Damien Broderick">Damien Broderick</Link>{' '}
          (<a href="https://en.wikipedia.org/wiki/Damien_Broderick" target="_blank" rel="noopener">Wikipedia</a>)
          — science fiction author, futurist
        </li>
        <li>
          <Link to="/author/Lee Daniel Crocker">Lee Daniel Crocker</Link>{' '}
          (<a href="https://en.wikipedia.org/wiki/Lee_Daniel_Crocker" target="_blank" rel="noopener">Wikipedia</a>)
          — programmer, early Wikipedia contributor
        </li>
        <li>
          <Link to="/author/Amara Graps">Amara Graps</Link>{' '}
          (<a href="https://en.wikipedia.org/wiki/Amara_Graps" target="_blank" rel="noopener">Wikipedia</a>)
          — planetary scientist at NASA/ESA
        </li>
        <li>
          <Link to="/author/Wei Dai">Wei Dai</Link>{' '}
          (<a href="https://en.wikipedia.org/wiki/Wei_Dai" target="_blank" rel="noopener">Wikipedia</a>)
          — cryptographer, creator of b-money (precursor to Bitcoin)
        </li>
        <li>
          <a href="https://en.wikipedia.org/wiki/Nick_Szabo" target="_blank" rel="noopener">Nick Szabo</a>
          — cryptographer, inventor of "smart contracts" and Bit Gold
        </li>
      </ul>

      <P>
        Many of the topics discussed on this list — AI alignment, existential risk, cryptocurrency,
        human enhancement — later became subjects of mainstream debate. Several of the people involved
        went on to found organizations and write books that shaped those debates.
      </P>

      <h2 style={{ fontSize: 16, marginBottom: 12, marginTop: 24 }}>About This Website</h2>

      <P>
        This website provides a searchable, browsable interface to the complete Extropians mailing list
        archive. The raw data comes from{' '}
        <a href="https://github.com/macterra/extropians" target="_blank" rel="noopener">macterra/extropians</a> on
        GitHub — 87 mbox files covering July 1996 to September 2003.
      </P>

      {stats && (
        <P>
          The archive contains <strong>{stats.total_messages.toLocaleString()}</strong> messages
          from <strong>{stats.unique_authors.toLocaleString()}</strong> unique authors,
          organized into <strong>{stats.threads.toLocaleString()}</strong> conversation threads,
          spanning <strong>{stats.date_range.start}</strong> to <strong>{stats.date_range.end}</strong>.
        </P>
      )}

      <P>Features:</P>
      <ul style={{ marginBottom: 12, paddingLeft: 20 }}>
        <li><Link to="/"><strong>Timeline</strong></Link> — message volume over time, click any month to filter threads</li>
        <li><Link to="/"><strong>Thread browser</strong></Link> — sort by reply count, date, or recent activity</li>
        <li><Link to="/"><strong>Participant filter</strong></Link> — find threads where specific people talked to each other</li>
        <li><Link to="/search?q=nanotechnology"><strong>Full-text search</strong></Link> — search across all message subjects and bodies</li>
        <li><Link to="/authors"><strong>Author profiles</strong></Link> — activity timelines and post history for each author</li>
        <li><strong>Message navigation</strong> — prev/next by date and within threads (click # on any message)</li>
        <li><strong>Wayback Machine links</strong> — archived versions of URLs from the era</li>
        <li><Link to="/authors"><strong>Wikipedia links</strong></Link> — for notable participants</li>
      </ul>

      <P>
        Another version of this archive is hosted by{' '}
        <a href="https://en.wikipedia.org/wiki/Wei_Dai" target="_blank" rel="noopener">Wei Dai</a> at{' '}
        <a href="http://extropians.weidai.com/" target="_blank" rel="noopener">extropians.weidai.com</a>.
      </P>

      <p style={{ color: 'var(--text-tertiary)', marginTop: 24, fontSize: 10 }}>
        Built with Python (FastAPI), SQLite (FTS5), React, and Recharts.
      </p>
    </div>
  )
}
