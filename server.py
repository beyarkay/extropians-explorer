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


@app.get("/api/stats")
def stats():
    with get_db() as db:
        total = db.execute("SELECT COUNT(*) FROM messages").fetchone()[0]
        authors = db.execute("SELECT COUNT(*) FROM authors").fetchone()[0]
        threads = db.execute("SELECT COUNT(*) FROM threads").fetchone()[0]
        date_range = db.execute(
            "SELECT MIN(year_month), MAX(year_month) FROM messages WHERE year_month IS NOT NULL"
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
def timeline():
    with get_db() as db:
        rows = db.execute(
            """SELECT year_month, COUNT(*) as count
               FROM messages
               WHERE year_month IS NOT NULL
               GROUP BY year_month
               ORDER BY year_month"""
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


@app.get("/api/search")
def search(q: str = Query(..., min_length=2), page: int = 1, per_page: int = 50):
    offset = (page - 1) * per_page
    with get_db() as db:
        # FTS5 search
        total = db.execute(
            "SELECT COUNT(*) FROM messages_fts WHERE messages_fts MATCH ?",
            (q,),
        ).fetchone()[0]

        rows = db.execute(
            """SELECT m.id, m.date, m.from_name, m.subject, m.thread_id,
                      snippet(messages_fts, 1, '<mark>', '</mark>', '...', 40) as snippet
               FROM messages_fts
               JOIN messages m ON m.id = messages_fts.rowid
               WHERE messages_fts MATCH ?
               ORDER BY rank
               LIMIT ? OFFSET ?""",
            (q, per_page, offset),
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
