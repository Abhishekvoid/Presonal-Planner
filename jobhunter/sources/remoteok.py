import urllib.request
import json
from typing import List, Dict, Any

def fetch_remoteok_jobs() -> List[Dict[str, Any]]:
    """Polls RemoteOK public JSON API."""
    url = "https://remoteok.com/api"
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            data = json.loads(response.read().decode("utf-8"))
            # First item in RemoteOK is API legal notice metadata
            raw_jobs = data[1:] if isinstance(data, list) and len(data) > 1 else []
            output = []
            for j in raw_jobs:
                if not isinstance(j, dict):
                    continue
                output.append({
                    "source": "remoteok",
                    "external_id": str(j.get("id", "")),
                    "title": j.get("position", ""),
                    "company": j.get("company", ""),
                    "location": j.get("location", "Remote"),
                    "is_remote": True,
                    "description": j.get("description", "") or j.get("position", ""),
                    "apply_url": j.get("url", ""),
                    "posted_at": str(j.get("date", "")),
                })
            return output
    except Exception:
        return []
