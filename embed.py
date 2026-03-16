"""Embed all messages using OpenAI text-embedding-3-small.

Usage:
    uv run python embed.py stats     # Print token distribution stats
    uv run python embed.py smoke     # Embed 10 messages as a test
    uv run python embed.py run       # Embed all remaining messages
"""

import os
import struct
import sqlite3
import sys
import time
from pathlib import Path

import numpy as np
import tiktoken
from dotenv import load_dotenv
from openai import OpenAI
from tqdm import tqdm

load_dotenv()

DB_PATH = "extropians.db"
MODEL = "text-embedding-3-small"
DIMENSIONS = 1536
BATCH_SIZE = 100
MAX_TOKENS = 8191


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_embeddings_table(conn: sqlite3.Connection):
    conn.execute("""
        CREATE TABLE IF NOT EXISTS embeddings (
            message_id INTEGER PRIMARY KEY,
            embedding BLOB NOT NULL,
            FOREIGN KEY (message_id) REFERENCES messages(id)
        )
    """)
    conn.commit()


_enc = None
def _get_enc():
    global _enc
    if _enc is None:
        _enc = tiktoken.encoding_for_model(MODEL)
    return _enc

def format_message(row) -> str:
    """Format a message for embedding, truncating to MAX_TOKENS if needed."""
    text = f"From: {row['from_name']}\nSubject: {row['subject']}\n\n{row['body'] or ''}"
    enc = _get_enc()
    tokens = enc.encode(text)
    if len(tokens) > MAX_TOKENS:
        text = enc.decode(tokens[:MAX_TOKENS])
    return text


def pack_embedding(vec: list[float]) -> bytes:
    """Pack a float list into a binary blob."""
    return struct.pack(f'{len(vec)}f', *vec)


def unpack_embedding(blob: bytes) -> np.ndarray:
    """Unpack a binary blob into a numpy array."""
    n = len(blob) // 4
    return np.array(struct.unpack(f'{n}f', blob), dtype=np.float32)


def cmd_stats():
    """Print token distribution stats."""
    conn = get_db()
    rows = conn.execute("SELECT id, from_name, subject, body FROM messages").fetchall()
    enc = tiktoken.encoding_for_model(MODEL)

    print(f"Counting tokens for {len(rows):,} messages...")
    lengths = []
    for row in tqdm(rows, desc="Tokenizing"):
        text = format_message(row)
        tokens = enc.encode(text)
        lengths.append(len(tokens))

    lengths = np.array(lengths)
    total_tokens = int(lengths.sum())

    print(f"\n{'='*50}")
    print(f"Token Distribution Stats")
    print(f"{'='*50}")
    print(f"Messages:     {len(lengths):,}")
    print(f"Total tokens: {total_tokens:,}")
    print(f"Min:          {int(lengths.min()):,}")
    print(f"Max:          {int(lengths.max()):,}")
    print(f"Mean:         {int(lengths.mean()):,}")
    print(f"Median:       {int(np.median(lengths)):,}")
    print(f"P95:          {int(np.percentile(lengths, 95)):,}")
    print(f"P99:          {int(np.percentile(lengths, 99)):,}")
    print(f"Exceeding {MAX_TOKENS}: {int((lengths > MAX_TOKENS).sum()):,} ({(lengths > MAX_TOKENS).mean()*100:.2f}%)")
    print(f"\nEstimated cost: ${total_tokens / 1_000_000 * 0.02:.2f}")
    conn.close()


def cmd_smoke():
    """Embed 10 messages as a smoke test."""
    conn = get_db()
    init_embeddings_table(conn)
    client = OpenAI()

    rows = conn.execute(
        "SELECT id, from_name, subject, body FROM messages LIMIT 10"
    ).fetchall()

    texts = [format_message(r) for r in rows]
    print(f"Embedding {len(texts)} messages...")

    response = client.embeddings.create(input=texts, model=MODEL)

    print(f"\nResults:")
    print(f"  Model: {response.model}")
    print(f"  Usage: {response.usage.total_tokens} tokens")
    print(f"  Cost:  ${response.usage.total_tokens / 1_000_000 * 0.02:.6f}")
    print(f"  Embeddings: {len(response.data)}")
    print(f"  Dimensions: {len(response.data[0].embedding)}")

    # Store them
    for row, emb_data in zip(rows, response.data):
        blob = pack_embedding(emb_data.embedding)
        conn.execute(
            "INSERT OR REPLACE INTO embeddings (message_id, embedding) VALUES (?, ?)",
            (row["id"], blob),
        )
    conn.commit()

    # Verify
    stored = conn.execute("SELECT COUNT(*) FROM embeddings").fetchone()[0]
    print(f"  Stored in DB: {stored}")

    # Verify unpacking
    blob = conn.execute("SELECT embedding FROM embeddings LIMIT 1").fetchone()[0]
    vec = unpack_embedding(blob)
    print(f"  Unpacked shape: {vec.shape}, dtype: {vec.dtype}")
    print(f"  First 5 values: {vec[:5]}")

    conn.close()
    print("\nSmoke test passed!")


def cmd_run():
    """Embed all remaining messages."""
    conn = get_db()
    init_embeddings_table(conn)
    client = OpenAI()

    # Find messages that don't have embeddings yet
    total = conn.execute("SELECT COUNT(*) FROM messages").fetchone()[0]
    done = conn.execute("SELECT COUNT(*) FROM embeddings").fetchone()[0]
    remaining_rows = conn.execute("""
        SELECT m.id, m.from_name, m.subject, m.body
        FROM messages m
        LEFT JOIN embeddings e ON e.message_id = m.id
        WHERE e.message_id IS NULL
        ORDER BY m.id
    """).fetchall()

    print(f"Total messages: {total:,}")
    print(f"Already embedded: {done:,}")
    print(f"Remaining: {len(remaining_rows):,}")

    if not remaining_rows:
        print("Nothing to do!")
        return

    total_tokens_used = 0
    errors = 0

    # Process in batches
    for i in tqdm(range(0, len(remaining_rows), BATCH_SIZE), desc="Embedding"):
        batch = remaining_rows[i:i + BATCH_SIZE]
        texts = [format_message(r) for r in batch]

        # Retry with exponential backoff
        for attempt in range(5):
            try:
                response = client.embeddings.create(input=texts, model=MODEL)
                break
            except Exception as e:
                if attempt == 4:
                    print(f"\nFailed after 5 attempts on batch {i}: {e}")
                    errors += len(batch)
                    response = None
                    break
                wait = 2 ** attempt
                print(f"\nRetry {attempt+1}/5 after {wait}s: {e}")
                time.sleep(wait)

        if response is None:
            continue

        total_tokens_used += response.usage.total_tokens

        # Store embeddings immediately for resumability
        for row, emb_data in zip(batch, response.data):
            blob = pack_embedding(emb_data.embedding)
            conn.execute(
                "INSERT OR REPLACE INTO embeddings (message_id, embedding) VALUES (?, ?)",
                (row["id"], blob),
            )
        conn.commit()

    final_count = conn.execute("SELECT COUNT(*) FROM embeddings").fetchone()[0]
    cost = total_tokens_used / 1_000_000 * 0.02

    print(f"\n{'='*50}")
    print(f"Embedding Complete")
    print(f"{'='*50}")
    print(f"Embedded:     {final_count:,} / {total:,}")
    print(f"Errors:       {errors:,}")
    print(f"Tokens used:  {total_tokens_used:,}")
    print(f"Cost:         ${cost:.2f}")

    conn.close()


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: uv run python embed.py [stats|smoke|run]")
        sys.exit(1)

    cmd = sys.argv[1]
    if cmd == "stats":
        cmd_stats()
    elif cmd == "smoke":
        cmd_smoke()
    elif cmd == "run":
        cmd_run()
    else:
        print(f"Unknown command: {cmd}")
        sys.exit(1)
