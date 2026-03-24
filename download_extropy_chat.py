"""Download extropy-chat mbox archives from lists.extropy.org.

Downloads all monthly .txt mbox files into data/extropy-chat/.
Skips files that already exist locally.

Usage:
    uv run python download_extropy_chat.py
"""

import re
import time
from pathlib import Path
from urllib.request import urlopen, Request

BASE_URL = "https://lists.extropy.org/pipermail/extropy-chat/"
OUTPUT_DIR = Path("data/extropy-chat")


def get_archive_links() -> list[str]:
    """Scrape the archive index page for .txt file links."""
    req = Request(BASE_URL, headers={"User-Agent": "ExtropiansArchiver/1.0"})
    html = urlopen(req).read().decode("utf-8", errors="replace")
    # Match links like "2006-August.txt"
    links = re.findall(r'href="(\d{4}-\w+\.txt)"', html)
    return sorted(set(links))


def download_file(filename: str) -> bool:
    """Download a single archive file. Returns True if downloaded, False if skipped."""
    output_path = OUTPUT_DIR / filename
    if output_path.exists():
        return False

    url = BASE_URL + filename
    print(f"  Downloading {filename}...", end="", flush=True)
    req = Request(url, headers={"User-Agent": "ExtropiansArchiver/1.0"})
    data = urlopen(req).read()
    output_path.write_bytes(data)
    size_kb = len(data) / 1024
    print(f" {size_kb:.0f} KB")
    return True


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    print("Fetching archive index...")
    links = get_archive_links()
    print(f"Found {len(links)} archive files")

    downloaded = 0
    skipped = 0
    for link in links:
        if download_file(link):
            downloaded += 1
            time.sleep(0.5)  # Be polite
        else:
            skipped += 1

    print(f"\nDone: {downloaded} downloaded, {skipped} skipped (already existed)")
    print(f"Total files: {len(list(OUTPUT_DIR.glob('*.txt')))}")


if __name__ == "__main__":
    main()
