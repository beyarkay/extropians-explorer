# Extropians Mailing List Archive

**Live site: [extropians.boydkane.com](https://extropians.boydkane.com)**

A web-based exploration and analysis tool for the [Extropians mailing list](https://en.wikipedia.org/wiki/Extropy_Institute) archive (1996–2003).

The Extropians list was a hub for discussion of transhumanism, AI, cryptography, nanotechnology, cryonics, and related topics. Participants included Eliezer Yudkowsky, Hal Finney, Robin Hanson, Anders Sandberg, Nick Bostrom, Max More, Wei Dai, and many others.

For more context, see [boydkane.com/projects/extropians](https://boydkane.com/projects/extropians).

## Features

- **Timeline** — message volume bar chart, click a month to filter
- **Thread browser** — sort by reply count, date, or recent activity
- **Nested thread view** — messages shown as a reply tree with collapse/expand
- **Participant filter** — find threads where specific people talked to each other (with autocomplete)
- **Topic tags** — 13 topics (ai, crypto, nanotech, cryonics, biology, space, consciousness, economics, philosophy, politics, computing, transhumanism, physics) with per-tag coloring
- **Embeddings map** — 132K messages projected onto a 2D canvas via OpenAI embeddings + UMAP, colored by cluster/year/author/tag, with thread highlighting on hover
- **Full-text search** — FTS5 across subjects and bodies with highlighted snippets
- **Author profiles** — activity chart, thread list, Wikipedia links for notable participants
- **Domain/link index** — all 80K URLs grouped by domain with context snippets
- **Glossary** — 60+ terms with inline tooltips in message bodies
- **Message navigation** — prev/next by date and within threads
- **Wayback Machine links** — archived versions of URLs from the era

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

# Extract URLs for the domain index
uv run python extract_urls.py

# (Optional) Embed messages and compute topic map
# Requires OPENAI_API_KEY in .env
uv run python embed.py stats   # check token distribution
uv run python embed.py smoke   # test with 10 messages
uv run python embed.py run     # embed all 132K messages (~$1.20)
uv run python project.py       # UMAP projection + k-means clustering

# Install frontend dependencies and build
cd frontend && pnpm install && pnpm run build && cd ..

# Start the server
uv run uvicorn server:app --port 8000
```

Then open http://localhost:8000.

## Architecture

- **Backend**: Python / FastAPI / SQLite (FTS5 for full-text search)
- **Frontend**: React / TypeScript / Vite / Recharts
- **Embeddings**: OpenAI text-embedding-3-small (1536d) → UMAP 2D projection → Canvas scatter plot
- **Data**: 87 mbox files → 132K messages, 2,100+ authors, 67K threads

### Key Files

| File              | Description                                                             |
| ----------------- | ----------------------------------------------------------------------- |
| `parse.py`        | Parses mbox files into SQLite with threading, FTS, author normalization |
| `tag_messages.py` | Tags messages with 13 topics via keyword regex matching                 |
| `extract_urls.py` | Extracts URLs from messages into domain index                           |
| `embed.py`        | Embeds messages using OpenAI API (stats/smoke/run modes)                |
| `project.py`      | Computes UMAP 2D projections and k-means clusters from embeddings       |
| `server.py`       | FastAPI backend with REST API                                           |
| `frontend/`       | React SPA                                                               |
| `deploy/`         | Nginx config and server start script                                    |

## Tests

```bash
# Run all E2E tests (requires server running on port 8000)
cd frontend && npx playwright test

# Run a specific test file
npx playwright test e2e/thread-view.spec.ts

# Run with visible browser
npx playwright test --headed
```

134 Playwright E2E tests covering all pages, filters, API endpoints, navigation, and edge cases.

## Deployment

Deployed automatically on push to `main` via GitHub Actions. The workflow:

1. Runs TypeScript checks and builds the frontend
2. Rsyncs code + built frontend to the server (DB is managed separately)
3. Restarts the FastAPI server on port 8002
4. Health-checks the live site

The DB is not in source control (too large). It lives on the server and is updated manually when the parser changes.

## API

| Endpoint                  | Description                                                                                     |
| ------------------------- | ----------------------------------------------------------------------------------------------- |
| `GET /api/stats`          | Message/author/thread counts (supports `?tag=`, `?participants=`)                               |
| `GET /api/timeline`       | Monthly message counts (supports filters)                                                       |
| `GET /api/tags`           | List all topic tags with counts                                                                 |
| `GET /api/clusters`       | List all embedding clusters with labels                                                         |
| `GET /api/threads`        | Paginated thread list (`?month=`, `?author=`, `?participants=`, `?tag=`, `?cluster=`, `?sort=`) |
| `GET /api/thread/:id`     | All messages in a thread with tags and cluster IDs                                              |
| `GET /api/message/:id`    | Single message with prev/next navigation                                                        |
| `GET /api/messages`       | Individual messages (`?month=`, `?author=`)                                                     |
| `GET /api/authors`        | Paginated author list                                                                           |
| `GET /api/authors/search` | Author name autocomplete                                                                        |
| `GET /api/author/:name`   | Author profile with activity and messages                                                       |
| `GET /api/search`         | Full-text search with snippets                                                                  |
| `GET /api/domains`        | Domain list with URL counts                                                                     |
| `GET /api/domain/:domain` | URLs for a domain with context snippets                                                         |
| `GET /api/map/points`     | Chunked UMAP-projected points for topic map                                                     |
| `GET /api/map/clusters`   | Cluster metadata with centroids                                                                 |

## Data Source

[macterra/extropians](https://github.com/macterra/extropians) — 87 mbox files, ~350 MB, July 1996 to September 2003.

Another version of this archive is hosted by [Wei Dai](https://en.wikipedia.org/wiki/Wei_Dai) at [extropians.weidai.com](http://extropians.weidai.com/).
