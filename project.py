"""Compute UMAP 2D projections and k-means clusters from embeddings.

Usage:
    uv run python project.py
"""

import sqlite3
import struct
import json
from collections import Counter

import numpy as np
from sklearn.cluster import KMeans
from umap import UMAP
from tqdm import tqdm

DB_PATH = "extropians.db"
N_CLUSTERS = 75
# Optimal params from sweep on 15K sample of 256K messages
UMAP_2D = {"n_neighbors": 30, "min_dist": 0.3}
UMAP_3D = {"n_neighbors": 50, "min_dist": 0.5}


def unpack_embedding(blob: bytes) -> np.ndarray:
    n = len(blob) // 4
    return np.array(struct.unpack(f'{n}f', blob), dtype=np.float32)


def main():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row

    # Load embeddings
    print("Loading embeddings...")
    rows = conn.execute("""
        SELECT e.message_id, e.embedding, m.from_name, m.subject, m.year_month
        FROM embeddings e
        JOIN messages m ON m.id = e.message_id
        ORDER BY e.message_id
    """).fetchall()

    print(f"Loaded {len(rows):,} embeddings")

    msg_ids = [r["message_id"] for r in rows]
    subjects = [r["subject"] or "" for r in rows]
    authors = [r["from_name"] or "" for r in rows]
    year_months = [r["year_month"] or "" for r in rows]

    print("Unpacking vectors...")
    embeddings = np.array([unpack_embedding(r["embedding"]) for r in tqdm(rows, desc="Unpacking")])
    print(f"Matrix shape: {embeddings.shape}")

    # K-means clustering
    print(f"\nRunning K-means with {N_CLUSTERS} clusters (n_init=10)...")
    kmeans = KMeans(n_clusters=N_CLUSTERS, random_state=42, n_init=10, verbose=1)
    cluster_ids = kmeans.fit_predict(embeddings)
    print("Clustering done")

    # Generate cluster labels from most common subject words
    print("\nGenerating cluster labels...")
    cluster_labels = {}
    stop_words = {'re', 'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
                  'of', 'is', 'it', 'was', 'be', 'are', 'with', 'that', 'this', 'from', 'by',
                  'not', 'no', 'if', 'as', 'do', 'so', 'we', 'you', 'my', 'he', 'she', 'his',
                  'her', 'they', 'what', 'how', 'why', 'when', 'who', 'all', 'just', 'about',
                  'up', 'out', 'one', 'more', 'has', 'have', 'had', 'can', 'will', 'would',
                  'could', 'should', 'been', 'being', 'some', 'than', 'them', 'its', 'also',
                  'very', 'much', 'any', 'our', 'your', 'there', 'other', 'into', 'over',
                  'only', 'then', 'these', 'those', 'own', 'which', 'way', 'may', 'even',
                  'new', 'two', 'get', 'got', 'most', 'make', 'does', 'did', 'think', 'know',
                  'see', 'like', 'time', 'good', 'people', 'take', 'going', 'well', 'things',
                  'want', 'use', 'say', 'don', 'same', 'thing', 'many', 'really', 'still',
                  'such', 'back', 'long', 'right', 'come', 'few', 'made', 'first', 'need',
                  'each', 'too', 'down', 'after', 'before', 'between', 'through', 'where',
                  'because', 'while', 'both', 'off', 'now', 'let', 'work', 'part', 'point',
                  'world', 'system', 'case', 'since', 'doesn', 'couldn'}

    for cluster_id in tqdm(range(N_CLUSTERS), desc="Labeling clusters"):
        mask = cluster_ids == cluster_id
        cluster_subjects = [subjects[i] for i in range(len(subjects)) if mask[i]]
        cluster_authors = [authors[i] for i in range(len(authors)) if mask[i]]

        # Word frequency in subjects
        words = Counter()
        for s in cluster_subjects:
            for w in s.lower().split():
                w = w.strip(',:;.?!()[]"\'')
                if len(w) > 2 and w not in stop_words:
                    words[w] += 1

        top_words = [w for w, _ in words.most_common(5)]
        top_authors = [a for a, _ in Counter(cluster_authors).most_common(3)]

        label = " / ".join(top_words[:3]) if top_words else f"Cluster {cluster_id}"
        cluster_labels[cluster_id] = {
            "label": label,
            "top_words": top_words,
            "top_authors": top_authors,
            "count": int(mask.sum()),
        }

    # Print cluster summary
    for cid in sorted(cluster_labels, key=lambda c: -cluster_labels[c]["count"]):
        info = cluster_labels[cid]
        print(f"  Cluster {cid:2d} ({info['count']:5d} msgs): {info['label']}  [{', '.join(info['top_authors'][:3])}]")

    # UMAP 2D projection
    print(f"\nRunning UMAP 2D (n_neighbors={UMAP_2D['n_neighbors']}, min_dist={UMAP_2D['min_dist']})...")
    print("  Step 1/3: Building nearest neighbor graph...")
    umap_2d = UMAP(
        n_components=2, metric='cosine', random_state=42, verbose=True,
        **UMAP_2D,
    )
    coords_2d = umap_2d.fit_transform(embeddings)
    print(f"UMAP 2D done. Shape: {coords_2d.shape}")

    # UMAP 3D projection
    print(f"\nRunning UMAP 3D (n_neighbors={UMAP_3D['n_neighbors']}, min_dist={UMAP_3D['min_dist']})...")
    print("  Step 1/3: Building nearest neighbor graph...")
    umap_3d = UMAP(
        n_components=3, metric='cosine', random_state=42, verbose=True,
        **UMAP_3D,
    )
    coords_3d = umap_3d.fit_transform(embeddings)
    print(f"UMAP 3D done. Shape: {coords_3d.shape}")

    # Store results
    print("\nStoring results...")
    conn.execute("DROP TABLE IF EXISTS projections")
    conn.execute("""
        CREATE TABLE projections (
            message_id INTEGER PRIMARY KEY,
            x REAL NOT NULL,
            y REAL NOT NULL,
            x3 REAL NOT NULL,
            y3 REAL NOT NULL,
            z3 REAL NOT NULL,
            cluster_id INTEGER NOT NULL
        )
    """)
    conn.execute("CREATE INDEX idx_proj_cluster ON projections(cluster_id)")

    conn.executescript("""
        CREATE TABLE IF NOT EXISTS clusters (
            cluster_id INTEGER PRIMARY KEY,
            label TEXT NOT NULL,
            top_words TEXT,
            top_authors TEXT,
            message_count INTEGER
        );
    """)
    conn.execute("DELETE FROM clusters")

    # Insert projections (2D + 3D)
    for i in tqdm(range(len(msg_ids)), desc="Storing projections"):
        conn.execute(
            "INSERT INTO projections (message_id, x, y, x3, y3, z3, cluster_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (msg_ids[i],
             float(coords_2d[i, 0]), float(coords_2d[i, 1]),
             float(coords_3d[i, 0]), float(coords_3d[i, 1]), float(coords_3d[i, 2]),
             int(cluster_ids[i])),
        )

    # Insert cluster labels
    for cid, info in cluster_labels.items():
        conn.execute(
            "INSERT INTO clusters (cluster_id, label, top_words, top_authors, message_count) VALUES (?, ?, ?, ?, ?)",
            (cid, info["label"], json.dumps(info["top_words"]), json.dumps(info["top_authors"]), info["count"]),
        )

    conn.commit()

    # Verify
    proj_count = conn.execute("SELECT COUNT(*) FROM projections").fetchone()[0]
    cluster_count = conn.execute("SELECT COUNT(*) FROM clusters").fetchone()[0]
    print(f"\nStored {proj_count:,} projections and {cluster_count} clusters")

    conn.close()


if __name__ == "__main__":
    main()
