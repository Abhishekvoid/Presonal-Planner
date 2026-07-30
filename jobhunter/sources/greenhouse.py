import urllib.request
import json
from typing import List, Dict, Any

def fetch_greenhouse_jobs(slug: str) -> List[Dict[str, Any]]:
    """Polls Greenhouse boards API for a company slug."""
    url = f"https://boards-api.greenhouse.io/v1/boards/{slug}/jobs?content=true"
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            data = json.loads(response.read().decode("utf-8"))
            raw_jobs = data.get("jobs", [])
            output = []
            for j in raw_jobs:
                output.append({
                    "source": "greenhouse",
                    "external_id": str(j.get("id")),
                    "title": j.get("title", ""),
                    "company": slug.capitalize(),
                    "location": j.get("location", {}).get("name", "Remote"),
                    "is_remote": "remote" in j.get("location", {}).get("name", "").lower(),
                    "description": j.get("content", "") or j.get("title", ""),
                    "apply_url": j.get("absolute_url", ""),
                    "posted_at": j.get("updated_at", ""),
                })
            return output
    except Exception as e:
        return []
