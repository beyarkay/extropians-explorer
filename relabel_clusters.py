"""Regenerate cluster labels without re-running UMAP."""
import sqlite3
import json
from collections import Counter

DB_PATH = "extropians.db"

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
              'world', 'system', 'case', 'since', 'doesn', 'couldn',
              'exi', 'extropy-chat', 'extropy', 'chat', 'extropian', 'extropians',
              'fwd', 'fyi', 'ot', 'otoh', 'imho', 'imo', 'btw', 'afaik',
              'http', 'https', 'www', 'com', 'org', 'net', 'html', 'htm',
              'wrote', 'writes', 'said', 'says', 'message', 'post', 'thread',
              'list', 'mail', 'email', 'subject', 'date', 'sent',
              'again', 'another', 'here', 'there', 'meta', 'spike', 'fwd'}

def main():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row

    rows = conn.execute("""
        SELECT p.cluster_id, m.subject, m.from_name
        FROM projections p JOIN messages m ON m.id = p.message_id
    """).fetchall()

    by_cluster: dict[int, dict] = {}
    for r in rows:
        cid = r["cluster_id"]
        if cid not in by_cluster:
            by_cluster[cid] = {"subjects": [], "authors": []}
        by_cluster[cid]["subjects"].append(r["subject"] or "")
        by_cluster[cid]["authors"].append(r["from_name"] or "")

    conn.execute("DELETE FROM clusters")
    for cid in sorted(by_cluster, key=lambda c: -len(by_cluster[c]["subjects"])):
        data = by_cluster[cid]
        words = Counter()
        for s in data["subjects"]:
            for w in s.lower().split():
                w = w.strip(',:;.?!()[]"\'')
                if len(w) > 2 and w not in stop_words:
                    words[w] += 1
        top_words = [w for w, _ in words.most_common(5)]
        top_authors = [a for a, _ in Counter(data["authors"]).most_common(3)]
        label = " / ".join(top_words[:3]) if top_words else f"Cluster {cid}"
        count = len(data["subjects"])
        conn.execute(
            "INSERT INTO clusters VALUES (?, ?, ?, ?, ?)",
            (cid, label, json.dumps(top_words), json.dumps(top_authors), count),
        )
        authors_str = ", ".join(top_authors[:3])
        print(f"  {cid:2d} ({count:5d}): {label}  [{authors_str}]")

    conn.commit()
    print(f"\nUpdated {len(by_cluster)} cluster labels")

if __name__ == "__main__":
    main()
