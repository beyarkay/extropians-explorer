"""FastAPI backend for Extropians mailing list explorer."""

import sqlite3
from contextlib import contextmanager
from pathlib import Path

from fastapi import FastAPI, Query
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

DB_PATH = "extropians.db"

app = FastAPI(title="Extropians Explorer")


@contextmanager
def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()


def _build_message_filter(
    tag: str | None = None,
    participants: list[str] | None = None,
):
    """Build WHERE clause and params for filtering messages."""
    where = ["year_month IS NOT NULL"]
    params: list[str] = []
    joins = ""

    if tag:
        joins += " JOIN message_tags mt ON mt.message_id = m.id"
        where.append("mt.tag = ?")
        params.append(tag)
    if participants:
        for p in participants:
            where.append("m.thread_id IN (SELECT thread_id FROM messages WHERE from_name = ?)")
            params.append(p)

    return joins, " AND ".join(where), params


@app.get("/api/stats")
def stats(
    tag: str | None = None,
    participants: list[str] = Query(default=[]),
):
    with get_db() as db:
        if not tag and not participants:
            # Fast path: no filters
            total = db.execute("SELECT COUNT(*) FROM messages").fetchone()[0]
            authors = db.execute("SELECT COUNT(*) FROM authors").fetchone()[0]
            threads = db.execute("SELECT COUNT(*) FROM threads").fetchone()[0]
            date_range = db.execute(
                "SELECT MIN(year_month), MAX(year_month) FROM messages WHERE year_month IS NOT NULL"
            ).fetchone()
        else:
            joins, where_clause, params = _build_message_filter(tag, participants or None)
            total = db.execute(
                f"SELECT COUNT(*) FROM messages m{joins} WHERE {where_clause}", params
            ).fetchone()[0]
            authors = db.execute(
                f"SELECT COUNT(DISTINCT from_name) FROM messages m{joins} WHERE {where_clause}", params
            ).fetchone()[0]
            threads = db.execute(
                f"SELECT COUNT(DISTINCT thread_id) FROM messages m{joins} WHERE {where_clause}", params
            ).fetchone()[0]
            date_range = db.execute(
                f"SELECT MIN(year_month), MAX(year_month) FROM messages m{joins} WHERE {where_clause}", params
            ).fetchone()

        return {
            "total_messages": total,
            "unique_authors": authors,
            "threads": threads,
            "date_range": {"start": date_range[0], "end": date_range[1]},
        }


@app.get("/api/tags")
def list_tags():
    with get_db() as db:
        rows = db.execute(
            "SELECT tag, COUNT(*) as count FROM message_tags GROUP BY tag ORDER BY count DESC"
        ).fetchall()
        return [{"tag": r["tag"], "count": r["count"]} for r in rows]


@app.get("/api/timeline")
def timeline(
    tag: str | None = None,
    participants: list[str] = Query(default=[]),
):
    with get_db() as db:
        joins, where_clause, params = _build_message_filter(tag, participants or None)
        rows = db.execute(
            f"""SELECT year_month, COUNT(*) as count
                FROM messages m{joins}
                WHERE {where_clause}
                GROUP BY year_month
                ORDER BY year_month""",
            params,
        ).fetchall()
        return [{"month": r["year_month"], "count": r["count"]} for r in rows]


@app.get("/api/threads")
def list_threads(
    month: str | None = None,
    author: str | None = None,
    participants: list[str] = Query(default=[]),
    tag: str | None = None,
    sort: str = "replies",
    page: int = 1,
    per_page: int = 50,
):
    offset = (page - 1) * per_page
    with get_db() as db:
        where = []
        params = []

        if month:
            where.append("""thread_id IN (
                SELECT DISTINCT thread_id FROM messages WHERE year_month = ?
            )""")
            params.append(month)
        if author:
            where.append("participants LIKE ?")
            params.append(f"%{author}%")
        for p in participants:
            where.append("participants LIKE ?")
            params.append(f"%{p}%")
        if tag:
            where.append("""thread_id IN (
                SELECT DISTINCT m.thread_id FROM messages m
                JOIN message_tags mt ON mt.message_id = m.id
                WHERE mt.tag = ?
            )""")
            params.append(tag)

        where_clause = f"WHERE {' AND '.join(where)}" if where else ""

        sort_map = {
            "replies": "message_count DESC",
            "date_asc": "first_date ASC",
            "date_desc": "first_date DESC",
            "recent_activity": "last_date DESC",
        }
        order = sort_map.get(sort, "message_count DESC")

        total = db.execute(
            f"SELECT COUNT(*) FROM threads {where_clause}", params
        ).fetchone()[0]

        rows = db.execute(
            f"""SELECT thread_id, subject, message_count, first_date, last_date, participants
                FROM threads {where_clause}
                ORDER BY {order}
                LIMIT ? OFFSET ?""",
            params + [per_page, offset],
        ).fetchall()

        # Get tags for each thread
        thread_ids = [r["thread_id"] for r in rows]
        thread_tags: dict[str, list[str]] = {}
        if thread_ids:
            placeholders = ",".join("?" * len(thread_ids))
            tag_rows = db.execute(
                f"""SELECT DISTINCT m.thread_id, mt.tag
                    FROM message_tags mt
                    JOIN messages m ON m.id = mt.message_id
                    WHERE m.thread_id IN ({placeholders})""",
                thread_ids,
            ).fetchall()
            for tr in tag_rows:
                thread_tags.setdefault(tr["thread_id"], []).append(tr["tag"])

        return {
            "total": total,
            "page": page,
            "per_page": per_page,
            "threads": [
                {
                    "thread_id": r["thread_id"],
                    "subject": r["subject"],
                    "message_count": r["message_count"],
                    "first_date": r["first_date"],
                    "last_date": r["last_date"],
                    "participants": r["participants"].split(",") if r["participants"] else [],
                    "tags": sorted(set(thread_tags.get(r["thread_id"], []))),
                }
                for r in rows
            ],
        }


@app.get("/api/messages")
def list_messages(
    month: str | None = None,
    author: str | None = None,
    page: int = 1,
    per_page: int = 50,
):
    """Get individual messages (not grouped by thread)."""
    offset = (page - 1) * per_page
    with get_db() as db:
        where = []
        params = []
        if month:
            where.append("year_month = ?")
            params.append(month)
        if author:
            where.append("from_name = ?")
            params.append(author)
        where_clause = f"WHERE {' AND '.join(where)}" if where else ""

        total = db.execute(f"SELECT COUNT(*) FROM messages {where_clause}", params).fetchone()[0]
        rows = db.execute(
            f"""SELECT id, date, from_name, subject, thread_id, year_month
                FROM messages {where_clause}
                ORDER BY date_epoch ASC
                LIMIT ? OFFSET ?""",
            params + [per_page, offset],
        ).fetchall()

        return {
            "total": total,
            "page": page,
            "per_page": per_page,
            "messages": [
                {
                    "id": r["id"],
                    "date": r["date"],
                    "from_name": r["from_name"],
                    "subject": r["subject"],
                    "thread_id": r["thread_id"],
                }
                for r in rows
            ],
        }


@app.get("/api/thread/{thread_id}")
def get_thread(thread_id: str):
    with get_db() as db:
        messages = db.execute(
            """SELECT id, message_id, date, from_name, from_email, subject, body,
                      in_reply_to, thread_id
               FROM messages
               WHERE thread_id = ?
               ORDER BY date_epoch ASC""",
            (thread_id,),
        ).fetchall()

        # Get tags for all messages in thread
        msg_ids = [m["id"] for m in messages]
        if msg_ids:
            placeholders = ",".join("?" * len(msg_ids))
            tag_rows = db.execute(
                f"SELECT message_id, tag FROM message_tags WHERE message_id IN ({placeholders})",
                msg_ids,
            ).fetchall()
            tags_by_msg: dict[int, list[str]] = {}
            for r in tag_rows:
                tags_by_msg.setdefault(r["message_id"], []).append(r["tag"])
        else:
            tags_by_msg = {}

        return [
            {
                "id": m["id"],
                "message_id": m["message_id"],
                "date": m["date"],
                "from_name": m["from_name"],
                "from_email": m["from_email"],
                "subject": m["subject"],
                "body": m["body"],
                "in_reply_to": m["in_reply_to"],
                "tags": tags_by_msg.get(m["id"], []),
            }
            for m in messages
        ]


@app.get("/api/message/{message_id:int}")
def get_message(message_id: int):
    with get_db() as db:
        m = db.execute(
            """SELECT id, message_id, date, from_name, from_email, subject, body,
                      in_reply_to, thread_id, year_month
               FROM messages WHERE id = ?""",
            (message_id,),
        ).fetchone()
        if not m:
            return {"error": "not found"}

        # Get prev/next by date
        prev_msg = db.execute(
            "SELECT id FROM messages WHERE date_epoch < (SELECT date_epoch FROM messages WHERE id = ?) ORDER BY date_epoch DESC LIMIT 1",
            (message_id,),
        ).fetchone()
        next_msg = db.execute(
            "SELECT id FROM messages WHERE date_epoch > (SELECT date_epoch FROM messages WHERE id = ?) ORDER BY date_epoch ASC LIMIT 1",
            (message_id,),
        ).fetchone()

        # Get prev/next in same thread
        prev_in_thread = db.execute(
            """SELECT id FROM messages
               WHERE thread_id = ? AND date_epoch < (SELECT date_epoch FROM messages WHERE id = ?)
               ORDER BY date_epoch DESC LIMIT 1""",
            (m["thread_id"], message_id),
        ).fetchone()
        next_in_thread = db.execute(
            """SELECT id FROM messages
               WHERE thread_id = ? AND date_epoch > (SELECT date_epoch FROM messages WHERE id = ?)
               ORDER BY date_epoch ASC LIMIT 1""",
            (m["thread_id"], message_id),
        ).fetchone()

        return {
            "id": m["id"],
            "message_id": m["message_id"],
            "date": m["date"],
            "from_name": m["from_name"],
            "from_email": m["from_email"],
            "subject": m["subject"],
            "body": m["body"],
            "in_reply_to": m["in_reply_to"],
            "thread_id": m["thread_id"],
            "year_month": m["year_month"],
            "prev_id": prev_msg[0] if prev_msg else None,
            "next_id": next_msg[0] if next_msg else None,
            "prev_in_thread_id": prev_in_thread[0] if prev_in_thread else None,
            "next_in_thread_id": next_in_thread[0] if next_in_thread else None,
        }


@app.get("/api/authors/search")
def search_authors(q: str = Query(..., min_length=1), limit: int = 10):
    """Autocomplete author names."""
    with get_db() as db:
        rows = db.execute(
            "SELECT canonical_name, post_count FROM authors WHERE canonical_name LIKE ? ORDER BY post_count DESC LIMIT ?",
            (f"%{q}%", limit),
        ).fetchall()
        return [{"name": r["canonical_name"], "post_count": r["post_count"]} for r in rows]


@app.get("/api/authors")
def list_authors(page: int = 1, per_page: int = 50):
    offset = (page - 1) * per_page
    with get_db() as db:
        total = db.execute("SELECT COUNT(*) FROM authors").fetchone()[0]
        rows = db.execute(
            """SELECT canonical_name, post_count, first_post, last_post
               FROM authors ORDER BY post_count DESC LIMIT ? OFFSET ?""",
            (per_page, offset),
        ).fetchall()
        return {
            "total": total,
            "page": page,
            "per_page": per_page,
            "authors": [
                {
                    "name": r["canonical_name"],
                    "post_count": r["post_count"],
                    "first_post": r["first_post"],
                    "last_post": r["last_post"],
                }
                for r in rows
            ],
        }


@app.get("/api/author/{name}")
def get_author(name: str):
    with get_db() as db:
        author = db.execute(
            "SELECT * FROM authors WHERE canonical_name = ?", (name,)
        ).fetchone()
        if not author:
            return {"error": "not found"}

        # Activity by month
        activity = db.execute(
            """SELECT year_month, COUNT(*) as count
               FROM messages WHERE from_name = ? AND year_month IS NOT NULL
               GROUP BY year_month ORDER BY year_month""",
            (name,),
        ).fetchall()

        # Recent messages
        messages = db.execute(
            """SELECT id, date, subject, thread_id
               FROM messages WHERE from_name = ?
               ORDER BY date_epoch DESC LIMIT 100""",
            (name,),
        ).fetchall()

        return {
            "name": author["canonical_name"],
            "post_count": author["post_count"],
            "first_post": author["first_post"],
            "last_post": author["last_post"],
            "emails": author["emails"],
            "activity": [{"month": r["year_month"], "count": r["count"]} for r in activity],
            "messages": [
                {"id": m["id"], "date": m["date"], "subject": m["subject"], "thread_id": m["thread_id"]}
                for m in messages
            ],
        }


def _fts5_escape(q: str) -> str:
    """Escape a query string for FTS5. Wrap each term in double quotes."""
    import re
    # Split on whitespace, quote each term to avoid syntax errors
    terms = q.strip().split()
    return " ".join(f'"{t}"' for t in terms if t)


@app.get("/api/search")
def search(q: str = Query(..., min_length=2), page: int = 1, per_page: int = 50):
    offset = (page - 1) * per_page
    fts_q = _fts5_escape(q)
    with get_db() as db:
        # FTS5 search
        total = db.execute(
            "SELECT COUNT(*) FROM messages_fts WHERE messages_fts MATCH ?",
            (fts_q,),
        ).fetchone()[0]

        rows = db.execute(
            """SELECT m.id, m.date, m.from_name, m.subject, m.thread_id,
                      snippet(messages_fts, 1, '<mark>', '</mark>', '...', 40) as snippet
               FROM messages_fts
               JOIN messages m ON m.id = messages_fts.rowid
               WHERE messages_fts MATCH ?
               ORDER BY rank
               LIMIT ? OFFSET ?""",
            (fts_q, per_page, offset),
        ).fetchall()

        return {
            "total": total,
            "page": page,
            "per_page": per_page,
            "query": q,
            "results": [
                {
                    "id": r["id"],
                    "date": r["date"],
                    "from_name": r["from_name"],
                    "subject": r["subject"],
                    "thread_id": r["thread_id"],
                    "snippet": r["snippet"],
                }
                for r in rows
            ],
        }


@app.get("/api/domains")
def list_domains(page: int = 1, per_page: int = 50, q: str | None = None):
    offset = (page - 1) * per_page
    with get_db() as db:
        where = ""
        params: list = []
        if q:
            where = "WHERE domain LIKE ?"
            params.append(f"%{q}%")

        total = db.execute(f"SELECT COUNT(*) FROM domains {where}", params).fetchone()[0]
        rows = db.execute(
            f"""SELECT domain, url_count, message_count
                FROM domains {where}
                ORDER BY url_count DESC
                LIMIT ? OFFSET ?""",
            params + [per_page, offset],
        ).fetchall()

        return {
            "total": total,
            "page": page,
            "per_page": per_page,
            "domains": [
                {"domain": r["domain"], "url_count": r["url_count"], "message_count": r["message_count"]}
                for r in rows
            ],
        }


@app.get("/api/domain/{domain:path}")
def get_domain(domain: str, page: int = 1, per_page: int = 20):
    offset = (page - 1) * per_page
    with get_db() as db:
        total = db.execute("SELECT COUNT(*) FROM urls WHERE domain = ?", (domain,)).fetchone()[0]
        rows = db.execute(
            """SELECT u.url, u.snippet, u.message_id, m.from_name, m.date, m.subject, m.thread_id
               FROM urls u
               JOIN messages m ON m.id = u.message_id
               WHERE u.domain = ?
               ORDER BY m.date_epoch DESC
               LIMIT ? OFFSET ?""",
            (domain, per_page, offset),
        ).fetchall()

        return {
            "total": total,
            "page": page,
            "per_page": per_page,
            "domain": domain,
            "urls": [
                {
                    "url": r["url"],
                    "snippet": r["snippet"],
                    "message_id": r["message_id"],
                    "from_name": r["from_name"],
                    "date": r["date"],
                    "subject": r["subject"],
                    "thread_id": r["thread_id"],
                }
                for r in rows
            ],
        }


@app.get("/api/map/points")
def map_points():
    """Return all projected points for the topic map. Compact binary-friendly JSON."""
    with get_db() as db:
        rows = db.execute("""
            SELECT p.message_id, p.x, p.y, p.cluster_id,
                   m.from_name, m.subject, m.year_month
            FROM projections p
            JOIN messages m ON m.id = p.message_id
            ORDER BY p.message_id
        """).fetchall()

        return {
            "points": [
                {
                    "id": r["message_id"],
                    "x": round(r["x"], 4),
                    "y": round(r["y"], 4),
                    "c": r["cluster_id"],
                    "a": r["from_name"],
                    "s": r["subject"],
                    "m": r["year_month"],
                }
                for r in rows
            ],
        }


@app.get("/api/map/clusters")
def map_clusters():
    """Return cluster metadata with centroids."""
    with get_db() as db:
        clusters = db.execute("SELECT * FROM clusters ORDER BY cluster_id").fetchall()
        # Compute centroids
        centroids = db.execute("""
            SELECT cluster_id, AVG(x) as cx, AVG(y) as cy
            FROM projections GROUP BY cluster_id
        """).fetchall()
        centroid_map = {r["cluster_id"]: (r["cx"], r["cy"]) for r in centroids}

        return [
            {
                "id": c["cluster_id"],
                "label": c["label"],
                "top_words": c["top_words"],
                "top_authors": c["top_authors"],
                "count": c["message_count"],
                "cx": round(centroid_map.get(c["cluster_id"], (0, 0))[0], 4),
                "cy": round(centroid_map.get(c["cluster_id"], (0, 0))[1], 4),
            }
            for c in clusters
        ]


# Serve frontend
frontend_dir = Path("frontend/dist")
if frontend_dir.exists():
    app.mount("/assets", StaticFiles(directory=str(frontend_dir / "assets")), name="assets")

    @app.get("/{full_path:path}")
    def serve_spa(full_path: str):
        # Don't serve index.html for API routes
        if full_path.startswith("api/"):
            return {"error": "not found"}
        # Serve static files if they exist
        file_path = frontend_dir / full_path
        if file_path.is_file() and ".." not in full_path:
            return FileResponse(file_path)
        # Everything else gets the SPA index.html
        return FileResponse(frontend_dir / "index.html")
