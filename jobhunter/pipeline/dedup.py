import hashlib
import re
from typing import Dict, Any

def compute_job_hash(company: str, title: str, location: str) -> str:
    """Computes sha256(normalize(company) + normalize(title) + normalize(location))."""
    def clean(text: str) -> str:
        return re.sub(r"[^a-z0-9]", "", (text or "").lower())

    normalized_str = f"{clean(company)}:{clean(title)}:{clean(location)}"
    return hashlib.sha256(normalized_str.encode("utf-8")).hexdigest()

def process_dedup(job_dict: Dict[str, Any]) -> Dict[str, Any]:
    """Adds 'hash' field to job_dict."""
    job_hash = compute_job_hash(
        job_dict.get("company", ""),
        job_dict.get("title", ""),
        job_dict.get("location", "")
    )
    job_dict["hash"] = job_hash
    return job_dict
