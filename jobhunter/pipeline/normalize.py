from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field, field_validator

class JobModel(BaseModel):
    source: str
    external_id: Optional[str] = None
    title: str = Field(..., min_length=2)
    company: str = Field(..., min_length=1)
    location: str = "Remote"
    is_remote: bool = False
    description: str = Field(..., min_length=10)
    apply_url: str = Field(..., min_length=8)
    posted_at: Optional[str] = None
    ingested_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

    @field_validator("apply_url")
    def validate_apply_url(cls, v):
        if not v or not v.startswith("http"):
            raise ValueError("apply_url must start with http")
        return v

def normalize_job(raw: Dict[str, Any]) -> Optional[JobModel]:
    """Validates raw job dict into JobModel. Returns None if invalid."""
    try:
        # Clean HTML tags from description if needed
        desc = raw.get("description", "").strip()
        if not desc:
            desc = raw.get("title", "")

        return JobModel(
            source=raw.get("source", "unknown"),
            external_id=raw.get("external_id"),
            title=raw.get("title", "").strip(),
            company=raw.get("company", "").strip(),
            location=raw.get("location", "Remote").strip(),
            is_remote=bool(raw.get("is_remote", False)),
            description=desc,
            apply_url=raw.get("apply_url", "").strip(),
            posted_at=raw.get("posted_at"),
        )
    except Exception:
        return None
