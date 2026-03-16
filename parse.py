"""Parse extropians mbox files into SQLite database."""

import mailbox
import email
import email.utils
import email.header
import hashlib
import re
import sqlite3
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path


DB_PATH = Path("extropians.db")
ARCHIVES_DIR = Path("data/archives")


def init_db(conn: sqlite3.Connection):
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            message_id TEXT UNIQUE,
            date TEXT,
            date_epoch INTEGER,
            year_month TEXT,
            from_name TEXT,
            from_email TEXT,
            subject TEXT,
            body TEXT,
            in_reply_to TEXT,
            refs TEXT,
            thread_id TEXT,
            source_file TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_date ON messages(date_epoch);
        CREATE INDEX IF NOT EXISTS idx_year_month ON messages(year_month);
        CREATE INDEX IF NOT EXISTS idx_from_name ON messages(from_name);
        CREATE INDEX IF NOT EXISTS idx_subject ON messages(subject);
        CREATE INDEX IF NOT EXISTS idx_message_id ON messages(message_id);
        CREATE INDEX IF NOT EXISTS idx_in_reply_to ON messages(in_reply_to);
        CREATE INDEX IF NOT EXISTS idx_thread_id ON messages(thread_id);

        CREATE VIRTUAL TABLE IF NOT EXISTS messages_fts USING fts5(
            subject, body, from_name,
            content='messages',
            content_rowid='id'
        );

        CREATE TABLE IF NOT EXISTS authors (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            canonical_name TEXT UNIQUE,
            post_count INTEGER DEFAULT 0,
            first_post TEXT,
            last_post TEXT,
            emails TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_author_count ON authors(post_count DESC);

        CREATE TABLE IF NOT EXISTS threads (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            thread_id TEXT UNIQUE,
            subject TEXT,
            message_count INTEGER DEFAULT 0,
            first_date TEXT,
            last_date TEXT,
            participants TEXT
        );
    """)


def decode_header(raw: str | None) -> str:
    if not raw:
        return ""
    parts = email.header.decode_header(raw)
    decoded = []
    for part, charset in parts:
        if isinstance(part, bytes):
            decoded.append(part.decode(charset or "utf-8", errors="replace"))
        else:
            decoded.append(part)
    return " ".join(decoded).strip()


def extract_body(msg: email.message.Message) -> str:
    """Extract plain text body, preserving quoted text for context."""
    body = ""
    if msg.is_multipart():
        for part in msg.walk():
            ct = part.get_content_type()
            if ct == "text/plain":
                payload = part.get_payload(decode=True)
                if payload:
                    body = payload.decode("utf-8", errors="replace")
                    break
    else:
        payload = msg.get_payload(decode=True)
        if payload:
            body = payload.decode("utf-8", errors="replace")

    # Remove trailing signature (lines after -- )
    lines = body.split("\n")
    result = []
    for line in lines:
        if line.strip() == "-- " or line.strip() == "--":
            break
        result.append(line)

    return "\n".join(result).strip()


def parse_date(msg: email.message.Message) -> tuple[str | None, int | None, str | None]:
    """Return (iso_date, epoch, year_month)."""
    raw = msg.get("Date")
    if not raw:
        return None, None, None
    try:
        parsed = email.utils.parsedate_to_datetime(raw)
        # Sanity check: must be between 1995 and 2005
        if parsed.year < 1995 or parsed.year > 2005:
            return None, None, None
        iso = parsed.isoformat()
        epoch = int(parsed.timestamp())
        ym = parsed.strftime("%Y-%m")
        return iso, epoch, ym
    except Exception:
        return None, None, None


AUTHOR_ALIASES = {
    "Mike Lorrey": "Michael Lorrey",
    "Michael S. Lorrey": "Michael Lorrey",
    "Michael S Lorrey": "Michael Lorrey",
    "Eliezer S. Yudkowsky": "Eliezer Yudkowsky",
    "Eliezer S Yudkowsky": "Eliezer Yudkowsky",
    "Hal": "Hal Finney",
    "Hal Harold Finney": "Hal Finney",
    "Spudboy100": "Spudboy100",
    "Brian D Williams": "Brian D. Williams",
    "Brian D Williams.": "Brian D. Williams",
    "Technotranscendence": "Daniel Ust",
    "Robert J. Bradbury": "Robert Bradbury",
    "Robert J Bradbury": "Robert Bradbury",
    "J. R. Molloy": "J.R. Molloy",
    "J.R.Molloy": "J.R. Molloy",
    "J R Molloy": "J.R. Molloy",
    "Michael M. Butler": "Michael Butler",
    "Michael M Butler": "Michael Butler",
    "Max M": "Max M.",
    "Lee Daniel Crocker": "Lee Daniel Crocker",
    "Ldcrocker": "Lee Daniel Crocker",
}


def normalise_name(name: str) -> str:
    """Normalise author name to canonical form."""
    name = name.strip().strip('"').strip("'")
    # Remove extra whitespace
    name = re.sub(r"\s+", " ", name)
    # Title case
    if name == name.upper() or name == name.lower():
        name = name.title()
    # Apply aliases
    return AUTHOR_ALIASES.get(name, name)


def make_message_id(msg: email.message.Message, source_file: str, idx: int) -> str:
    """Get or generate a unique message ID."""
    mid = msg.get("Message-ID", "").strip().strip("<>")
    if mid:
        return mid
    # Generate synthetic ID from content hash
    h = hashlib.md5(f"{source_file}:{idx}:{msg.get('Subject','')}:{msg.get('From','')}".encode()).hexdigest()
    return f"synthetic-{h}"


def parse_all():
    if DB_PATH.exists():
        DB_PATH.unlink()

    conn = sqlite3.connect(str(DB_PATH))
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=NORMAL")
    init_db(conn)

    mbox_files = sorted(ARCHIVES_DIR.glob("list-archive.*"))
    print(f"Found {len(mbox_files)} mbox files")

    total = 0
    dupes = 0
    errors = 0

    for mbox_path in mbox_files:
        mbox = mailbox.mbox(str(mbox_path))
        count = 0
        for idx, msg in enumerate(mbox):
            try:
                message_id = make_message_id(msg, mbox_path.name, idx)
                date_iso, date_epoch, year_month = parse_date(msg)

                from_raw = decode_header(msg.get("From", ""))
                # Parse "Name <email>" format
                from_name, from_email = email.utils.parseaddr(from_raw)
                if not from_name:
                    from_name = from_email.split("@")[0] if from_email else "Unknown"
                from_name = normalise_name(from_name)

                subject = decode_header(msg.get("Subject", ""))
                body = extract_body(msg)

                in_reply_to = (msg.get("In-Reply-To") or "").strip().strip("<>")
                references = (msg.get("References") or "").strip()

                conn.execute(
                    """INSERT OR IGNORE INTO messages
                       (message_id, date, date_epoch, year_month, from_name, from_email,
                        subject, body, in_reply_to, refs, source_file)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                    (message_id, date_iso, date_epoch, year_month, from_name, from_email,
                     subject, body, in_reply_to, references, mbox_path.name),
                )
                if conn.total_changes > total + count:
                    count += 1
                else:
                    dupes += 1
            except Exception as e:
                errors += 1
                if errors < 10:
                    print(f"  Error in {mbox_path.name} msg {idx}: {e}")

        conn.commit()
        total += count
        print(f"  {mbox_path.name}: {count} messages")

    print(f"\nTotal: {total} messages ({dupes} duplicates, {errors} errors)")

    # Build threads
    print("\nBuilding threads...")
    build_threads(conn)

    # Build FTS index
    print("Building full-text search index...")
    conn.execute("INSERT INTO messages_fts(messages_fts) VALUES('rebuild')")
    conn.commit()

    # Build author table
    print("Building author index...")
    build_authors(conn)

    # Print stats
    print_stats(conn)

    conn.close()


def build_threads(conn: sqlite3.Connection):
    """Assign thread_id to each message using union-find on references."""
    # Load all message IDs and their references
    rows = conn.execute(
        "SELECT id, message_id, in_reply_to, refs FROM messages"
    ).fetchall()

    # Union-Find
    parent = {}

    def find(x):
        while parent.get(x, x) != x:
            parent[x] = parent.get(parent[x], parent[x])
            x = parent[x]
        return x

    def union(a, b):
        ra, rb = find(a), find(b)
        if ra != rb:
            parent[ra] = rb

    mid_to_id = {}
    for row_id, message_id, _, _ in rows:
        mid_to_id[message_id] = row_id
        parent[message_id] = message_id

    for row_id, message_id, in_reply_to, refs in rows:
        if in_reply_to:
            irt = in_reply_to.strip("<>")
            if irt not in parent:
                parent[irt] = irt
            union(message_id, irt)
        if refs:
            ref_ids = re.findall(r"<([^>]+)>", refs)
            for ref in ref_ids:
                if ref not in parent:
                    parent[ref] = ref
                union(message_id, ref)

    # Assign thread IDs
    for row_id, message_id, _, _ in rows:
        thread_id = find(message_id)
        conn.execute("UPDATE messages SET thread_id = ? WHERE id = ?", (thread_id, row_id))

    conn.commit()

    # Build threads summary table
    conn.execute("DELETE FROM threads")
    conn.execute("""
        INSERT INTO threads (thread_id, subject, message_count, first_date, last_date, participants)
        SELECT
            thread_id,
            (SELECT subject FROM messages m2 WHERE m2.thread_id = m.thread_id ORDER BY date_epoch ASC LIMIT 1),
            COUNT(*),
            MIN(date),
            MAX(date),
            GROUP_CONCAT(DISTINCT from_name)
        FROM messages m
        WHERE thread_id IS NOT NULL
        GROUP BY thread_id
    """)
    conn.commit()
    thread_count = conn.execute("SELECT COUNT(*) FROM threads").fetchone()[0]
    print(f"  {thread_count} threads identified")


def build_authors(conn: sqlite3.Connection):
    conn.execute("DELETE FROM authors")
    conn.execute("""
        INSERT INTO authors (canonical_name, post_count, first_post, last_post, emails)
        SELECT
            from_name,
            COUNT(*),
            MIN(date),
            MAX(date),
            GROUP_CONCAT(DISTINCT from_email)
        FROM messages
        GROUP BY from_name
    """)
    conn.commit()


def print_stats(conn: sqlite3.Connection):
    total = conn.execute("SELECT COUNT(*) FROM messages").fetchone()[0]
    authors = conn.execute("SELECT COUNT(*) FROM authors").fetchone()[0]
    threads = conn.execute("SELECT COUNT(*) FROM threads").fetchone()[0]

    print(f"\n{'='*60}")
    print(f"EXTROPIANS MAILING LIST ARCHIVE STATS")
    print(f"{'='*60}")
    print(f"Total messages:  {total:,}")
    print(f"Unique authors:  {authors:,}")
    print(f"Threads:         {threads:,}")

    # Date range
    date_range = conn.execute(
        "SELECT MIN(year_month), MAX(year_month) FROM messages WHERE year_month IS NOT NULL"
    ).fetchone()
    print(f"Date range:      {date_range[0]} to {date_range[1]}")

    # Top 20 posters
    print(f"\nTop 20 Posters:")
    print(f"{'Rank':<5} {'Name':<35} {'Posts':>6}")
    print(f"{'-'*5} {'-'*35} {'-'*6}")
    top = conn.execute(
        "SELECT canonical_name, post_count FROM authors ORDER BY post_count DESC LIMIT 20"
    ).fetchall()
    for i, (name, count) in enumerate(top, 1):
        print(f"{i:<5} {name:<35} {count:>6}")

    # Messages per month (sample)
    print(f"\nMessages per month (top 10 busiest):")
    monthly = conn.execute(
        "SELECT year_month, COUNT(*) as c FROM messages WHERE year_month IS NOT NULL GROUP BY year_month ORDER BY c DESC LIMIT 10"
    ).fetchall()
    for ym, c in monthly:
        print(f"  {ym}: {c:,}")


if __name__ == "__main__":
    parse_all()
