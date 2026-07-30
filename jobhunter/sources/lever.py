import urllib.request
import json
from typing import List, Dict, Any

def fetch_lever_jobs(slug: str) -> List[Dict[str, Any]]:
    """Polls Lever postings API for a company slug."""
    url = f"https://api.lever.co/v0/postings/{slug}"
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            raw_jobs = json.loads(response.read().decode("utf-8"))
            output = []
            for j in raw_jobs:
                categories = j.get("categories", {})
                location = categories.get("location", "Remote")
                commitment = categories.get("commitment", "")
                output.append({
                    "source": "lever",
                    "external_id": str(j.get("id")),
                    "title": j.get("text", ""),
                    "company": slug.capitalize(),
                    "location": f"{location} {commitment}".strip(),
                    "is_remote": "remote" in location.lower() or "workplaceType" in j and j.get("workplaceType") == "remote",
                    "description": j.get("descriptionPlain", "") or j.get("text", ""),
                    "apply_url": j.get("hostedUrl", ""),
                    "posted_at": str(j.get("createdAt", "")),
                })
            return output
    except Exception:
        return []
