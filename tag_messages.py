"""Tag messages with keyword-based topics."""

import re
import sqlite3

DB_PATH = "extropians.db"

# Topic definitions: tag -> list of keyword patterns (case-insensitive)
# Patterns are matched against subject + first 1000 chars of body
TOPICS = {
    "ai": [
        r"\bartificial intelligence\b", r"\b(strong |weak )?ai\b", r"\bagi\b",
        r"\bmachine learning\b", r"\bneural net", r"\bdeep learning\b",
        r"\bintelligent (agent|machine|system)", r"\bturing test\b",
        r"\bfriendly ai\b", r"\bunfriendly ai\b", r"\bseed ai\b",
        r"\bsingularity\b", r"\bsuperintelligen",
    ],
    "crypto": [
        r"\bcryptograph", r"\bencrypt", r"\bpublic[- ]key\b", r"\bprivate[- ]key\b",
        r"\bdigital (cash|money|currency)", r"\becash\b", r"\bb-money\b",
        r"\bbit gold\b", r"\bhash ?cash\b", r"\bcypherpunk",
        r"\bzero[- ]knowledge\b", r"\bpgp\b", r"\bgpg\b",
        r"\brsa\b", r"\bdigital signature",
    ],
    "nanotech": [
        r"\bnanotech", r"\bmolecular (assembl|manufactur|machine)",
        r"\bdrexler\b", r"\bnanoscale\b", r"\bnanobot", r"\bnanorobot",
        r"\bgrey goo\b", r"\bgray goo\b", r"\bmolecular engineer",
        r"\bself[- ]replicat",
    ],
    "cryonics": [
        r"\bcryonics\b", r"\bcryopreserv", r"\bvitrif", r"\bcryostat\b",
        r"\balcor\b", r"\bcryogenic", r"\bsuspended animation",
        r"\bneuropreserv", r"\bfreez.*brain",
    ],
    "biology": [
        r"\bgenetic engineer", r"\bgene therap", r"\bgenomic",
        r"\bbiotech", r"\bcloning\b", r"\bgerm[- ]line\b",
        r"\btransgenic\b", r"\bdna\b", r"\brna\b",
        r"\bstem cell", r"\blife extension\b", r"\blongevity\b",
        r"\baging\b", r"\bageing\b", r"\banti[- ]aging\b",
        r"\bimmortali", r"\btelomer",
    ],
    "space": [
        r"\bspace (travel|coloniz|explor|station|elevator)",
        r"\borbital\b", r"\basteroid", r"\bmars (coloniz|base|mission)",
        r"\brocket", r"\bspaceship\b", r"\binterstellar\b",
        r"\bo'?neill (colony|habitat|cylinder)", r"\bspace habitat",
    ],
    "consciousness": [
        r"\bconsciousness\b", r"\bqualia\b", r"\bhard problem\b",
        r"\bzombie.*argument", r"\bphenomenal\b", r"\bsubjective experience",
        r"\bmind[- ]body\b", r"\bdualism\b", r"\bfunctionalism\b",
        r"\bupload", r"\bmind upload", r"\bwhole brain emulation",
    ],
    "economics": [
        r"\bfree market\b", r"\blibertarian", r"\banarcho[- ]capitalis",
        r"\bprediction market", r"\bfutures market\b",
        r"\bgame theory\b", r"\bpricing\b", r"\btaxation\b",
        r"\bpublic choice\b", r"\baustrian economics\b",
    ],
    "philosophy": [
        r"\bphilosoph", r"\bethics\b", r"\bethical\b", r"\bmoral",
        r"\bexistential risk\b", r"\bx-risk\b", r"\bfermi paradox\b",
        r"\bsimulation (argument|hypothesis)\b", r"\bgreat filter\b",
        r"\butilitari", r"\bdeontolog", r"\bconsequentiali",
    ],
    "politics": [
        r"\bgovernment\b", r"\bpolitics\b", r"\bpolitical\b",
        r"\bdemocra", r"\brepublican\b", r"\belection\b",
        r"\bregulat", r"\bfreedom\b", r"\bliberty\b",
        r"\bgun (control|right)", r"\bfirst amendment\b",
        r"\bsecond amendment\b",
    ],
    "computing": [
        r"\bquantum comput", r"\bmoore'?s law\b", r"\binternet\b",
        r"\bopen source\b", r"\blinux\b", r"\bprogramming\b",
        r"\bsoftware\b", r"\bhardware\b", r"\bcomputation\b",
    ],
    "transhumanism": [
        r"\btranshuman", r"\bposthuman", r"\bextrop",
        r"\bhuman enhancement\b", r"\bcognitive enhancement\b",
        r"\bnootropic", r"\baugment", r"\bcyborg\b",
        r"\bmorphological freedom\b",
    ],
    "physics": [
        r"\bquantum (mechanic|physic|theor)", r"\brelativity\b",
        r"\bthermodynamic", r"\bentropy\b", r"\bcosmolog",
        r"\bmany[- ]worlds\b", r"\bmultiverse\b",
        r"\bstring theory\b", r"\bdark (matter|energy)\b",
    ],
}


def tag_all():
    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=NORMAL")

    # Create tags table
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS message_tags (
            message_id INTEGER,
            tag TEXT,
            PRIMARY KEY (message_id, tag)
        );
        CREATE INDEX IF NOT EXISTS idx_tag ON message_tags(tag);
        CREATE INDEX IF NOT EXISTS idx_msg_tag ON message_tags(message_id);
    """)
    conn.execute("DELETE FROM message_tags")
    conn.commit()

    # Compile patterns
    compiled = {}
    for tag, patterns in TOPICS.items():
        compiled[tag] = re.compile("|".join(patterns), re.IGNORECASE)

    # Process all messages
    rows = conn.execute("SELECT id, subject, body FROM messages").fetchall()
    print(f"Tagging {len(rows)} messages...")

    batch = []
    tag_counts: dict[str, int] = {}

    for msg_id, subject, body in rows:
        text = (subject or "") + " " + (body or "")[:1000]
        for tag, pattern in compiled.items():
            if pattern.search(text):
                batch.append((msg_id, tag))
                tag_counts[tag] = tag_counts.get(tag, 0) + 1

    conn.executemany("INSERT OR IGNORE INTO message_tags VALUES (?, ?)", batch)
    conn.commit()

    print(f"\nTagged {len(batch)} message-tag pairs")
    print(f"\nTag distribution:")
    for tag, count in sorted(tag_counts.items(), key=lambda x: -x[1]):
        print(f"  {tag:<20} {count:>6}")

    conn.close()


if __name__ == "__main__":
    tag_all()
