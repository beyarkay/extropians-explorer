# Extropians

A web-based exploration and analysis tool for the [Extropians mailing list](https://en.wikipedia.org/wiki/Extropy_Institute) archive (1996–2003).

The Extropians list was a hub for discussion of transhumanism, AI, cryptography, nanotechnology, cryonics, and related topics. Participants included Eliezer Yudkowsky, Hal Finney, Robin Hanson, Anders Sandberg, Nick Bostrom, Max More, Wei Dai, and many others.

## Quick Start

```bash
# Clone the data
git clone https://github.com/macterra/extropians.git data

# Install Python dependencies
uv sync

# Parse the mbox archives into SQLite
uv run python parse.py

# Tag messages with topics
uv run python tag_messages.py

# Install frontend dependencies and build
cd frontend && pnpm install && pnpm run build && cd ..

# Start the server
uv run uvicorn server:app --port 8000
```

Then open http://localhost:8000.

## Architecture

- **Backend**: Python / FastAPI / SQLite (FTS5 for full-text search)
- **Frontend**: React / TypeScript / Vite / Recharts
- **Data**: 87 mbox files → 132K messages, 2,100+ authors, 57K threads

### Key Files

| File | Description |
|---|---|
| `parse.py` | Parses mbox files into SQLite with threading, FTS, author normalization |
| `tag_messages.py` | Tags messages with 13 topics via keyword regex matching |
| `server.py` | FastAPI backend with REST API |
| `frontend/` | React SPA |

## Features

- **Timeline** — message volume bar chart, click a month to filter
- **Thread browser** — sort by reply count, date, or recent activity
- **Nested thread view** — messages shown as a reply tree with collapse/expand
- **Participant filter** — find threads where specific people talked to each other (with autocomplete)
- **Topic tags** — 13 topics (ai, crypto, nanotech, cryonics, biology, space, consciousness, economics, philosophy, politics, computing, transhumanism, physics) with per-tag coloring
- **Full-text search** — FTS5 across subjects and bodies with highlighted snippets
- **Author profiles** — activity chart, thread list, Wikipedia links for notable participants
- **Message navigation** — prev/next by date and within threads
- **Glossary** — 60+ terms with inline tooltips in message bodies
- **Wayback Machine links** — archived versions of URLs from the era
- **Upvote/downvote** — per-message voting (localStorage)

## API

| Endpoint | Description |
|---|---|
| `GET /api/stats` | Message/author/thread counts (supports `?tag=`, `?participants=`) |
| `GET /api/timeline` | Monthly message counts (supports filters) |
| `GET /api/tags` | List all topic tags with counts |
| `GET /api/threads` | Paginated thread list (`?month=`, `?author=`, `?participants=`, `?tag=`, `?sort=`) |
| `GET /api/thread/:id` | All messages in a thread with tags |
| `GET /api/message/:id` | Single message with prev/next navigation |
| `GET /api/messages` | Individual messages (`?month=`, `?author=`) |
| `GET /api/authors` | Paginated author list |
| `GET /api/authors/search` | Author name autocomplete |
| `GET /api/author/:name` | Author profile with activity and messages |
| `GET /api/search` | Full-text search with snippets |

## Tests

```bash
cd frontend && npx playwright test
```

102 E2E tests covering all pages, filters, API endpoints, navigation, and edge cases.

## Data Source

[macterra/extropians](https://github.com/macterra/extropians) — 87 mbox files, ~350 MB, July 1996 to September 2003.
