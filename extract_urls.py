"""Extract all URLs from message bodies into a urls table with domain, context snippet, and source message."""

import re
import sqlite3
from urllib.parse import urlparse

DB_PATH = "extropians.db"
URL_RE = re.compile(r'https?://[^\s<>"{}|\\^`\[\]]+')


def extract_urls():
    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=NORMAL")

    conn.executescript("""
        CREATE TABLE IF NOT EXISTS urls (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            url TEXT,
            domain TEXT,
            message_id INTEGER,
            snippet TEXT,
            FOREIGN KEY (message_id) REFERENCES messages(id)
        );
        CREATE INDEX IF NOT EXISTS idx_url_domain ON urls(domain);
        CREATE INDEX IF NOT EXISTS idx_url_message ON urls(message_id);
    """)
    conn.execute("DELETE FROM urls")
    conn.commit()

    rows = conn.execute("SELECT id, body FROM messages WHERE body IS NOT NULL").fetchall()
    print(f"Scanning {len(rows)} messages for URLs...")

    batch = []
    url_count = 0
    domain_counts: dict[str, int] = {}

    for msg_id, body in rows:
        if not body:
            continue
        for match in URL_RE.finditer(body):
            url = match.group(0)
            # Clean trailing punctuation
            url = url.rstrip('.,;:)>]')

            try:
                parsed = urlparse(url)
                domain = parsed.netloc.lower()
                if not domain:
                    continue
            except Exception:
                continue

            # Extract snippet: ~60 chars before and after the URL
            start = max(0, match.start() - 80)
            end = min(len(body), match.end() + 80)
            snippet = body[start:end].strip()
            # Clean up snippet boundaries to word boundaries
            if start > 0:
                snippet = '...' + snippet[snippet.find(' ') + 1:] if ' ' in snippet[:20] else '...' + snippet
            if end < len(body):
                last_space = snippet.rfind(' ')
                if last_space > len(snippet) - 20:
                    snippet = snippet[:last_space] + '...'
                else:
                    snippet = snippet + '...'

            batch.append((url, domain, msg_id, snippet))
            url_count += 1
            domain_counts[domain] = domain_counts.get(domain, 0) + 1

    conn.executemany("INSERT INTO urls (url, domain, message_id, snippet) VALUES (?, ?, ?, ?)", batch)

    # Create domain summary table
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS domains (
            domain TEXT PRIMARY KEY,
            url_count INTEGER,
            message_count INTEGER
        );
    """)
    conn.execute("DELETE FROM domains")
    conn.execute("""
        INSERT INTO domains (domain, url_count, message_count)
        SELECT domain, COUNT(*), COUNT(DISTINCT message_id)
        FROM urls
        GROUP BY domain
    """)
    conn.commit()

    domain_count = conn.execute("SELECT COUNT(*) FROM domains").fetchone()[0]
    print(f"\nExtracted {url_count:,} URLs across {domain_count:,} domains")
    print(f"\nTop 20 domains:")
    for row in conn.execute("SELECT domain, url_count FROM domains ORDER BY url_count DESC LIMIT 20").fetchall():
        print(f"  {row[0]:<40} {row[1]:>5}")

    conn.close()


if __name__ == "__main__":
    extract_urls()
