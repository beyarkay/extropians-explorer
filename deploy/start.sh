#!/usr/bin/env bash
# Start the extropians FastAPI server on port 8002.
# Called by the deploy workflow after rsync. Installs deps,
# kills any existing process on 8002, and starts uvicorn.
set -e
cd /home/brk/extropians

export PATH="$HOME/.local/bin:$PATH"

# Install uv if not present
if ! command -v uv &> /dev/null; then
  curl -LsSf https://astral.sh/uv/install.sh | sh
fi

# Install Python deps
uv sync --frozen 2>/dev/null || uv sync

# Stop existing process on port 8002
kill $(lsof -t -i :8002) 2>/dev/null || true
sleep 1

# Start server
nohup uv run uvicorn server:app --host 127.0.0.1 --port 8002 > extropians.log 2>&1 &

sleep 3
echo "=== Server log ==="
head -20 extropians.log
echo "=== Process check ==="
lsof -i :8002 || echo "WARNING: No process on port 8002"
