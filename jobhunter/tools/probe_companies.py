import urllib.request
import urllib.error
from pathlib import Path
from jobhunter.config import COMPANIES_PATH

def probe_slug(platform: str, slug: str) -> bool:
    """Probes whether a Greenhouse or Lever ATS slug returns HTTP 200."""
    if platform.lower() == "greenhouse":
        url = f"https://boards-api.greenhouse.io/v1/boards/{slug}/jobs"
    elif platform.lower() == "lever":
        url = f"https://api.lever.co/v0/postings/{slug}"
    else:
        return False

    req = urllib.request.Request(
        url,
        headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
    )
    try:
        with urllib.request.urlopen(req, timeout=5) as response:
            return response.status == 200
    except (urllib.error.HTTPError, urllib.error.URLError, Exception):
        return False

def run_probe():
    print("=== Probing ATS Company Slugs ===")
    if not COMPANIES_PATH.exists():
        print(f"Error: {COMPANIES_PATH} not found.")
        return

    with open(COMPANIES_PATH, "r", encoding="utf-8") as f:
        lines = [line.strip() for line in f if line.strip() and not line.startswith("#")]

    verified = []
    for line in lines:
        parts = [p.strip() for p in line.split(",")]
        if len(parts) != 2:
            continue
        platform, slug = parts[0], parts[1]
        is_live = probe_slug(platform, slug)
        status = "[LIVE 200]" if is_live else "[DEAD 404]"
        print(f"[{platform:10s}] {slug:20s} -> {status}")
        if is_live:
            verified.append(f"{platform},{slug}")

    print(f"\nTotal Probed: {len(lines)} | Verified Live: {len(verified)}")
    return verified

if __name__ == "__main__":
    run_probe()
