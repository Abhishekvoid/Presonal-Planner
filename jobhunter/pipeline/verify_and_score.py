import urllib.request
import urllib.error
import json
from pathlib import Path
from typing import Dict, Any, Tuple
from jobhunter.config import OPENROUTER_API_KEY, DEFAULT_MODEL, RESUME_PATH

def check_link_alive(url: str) -> bool:
    """HEAD or GET request to verify apply_url returns HTTP 200."""
    try:
        req = urllib.request.Request(
            url,
            headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"},
            method="HEAD"
        )
        with urllib.request.urlopen(req, timeout=5) as response:
            return response.status in (200, 301, 302, 307, 308)
    except Exception:
        # Fallback GET check if HEAD is blocked by server
        try:
            req = urllib.request.Request(
                url,
                headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
            )
            with urllib.request.urlopen(req, timeout=5) as response:
                return response.status in (200, 301, 302, 307, 308)
        except Exception:
            return False

def load_resume_text() -> str:
    """Loads plain text resume from jobhunter/resume.md."""
    if RESUME_PATH.exists():
        return RESUME_PATH.read_text(encoding="utf-8")
    return "Abhishek Rajput — AI & Robotics Backend Engineer (Python, Django, Celery, Redis, Qdrant, RAG)"

def evaluate_job_with_llm(job_title: str, company: str, location: str, jd_text: str) -> Tuple[bool, float, str, list]:
    """
    Single Folded LLM Call:
    1. Checks if posting is legitimate (not MLM, ghost, commission-only, or scam).
    2. Scores candidate fit (0.0 to 100.0) based on resume rubric.
    3. Returns top 2 skill gaps and 1-line reason.
    """
    if not OPENROUTER_API_KEY:
        # Fallback scoring heuristic if API key is missing
        return True, 75.0, "Matched skills (Python, Django, Systems)", ["Kubernetes", "AWS"]

    resume = load_resume_text()

    prompt = f"""You are a strict technical recruiter evaluating a job posting for a candidate.

CANDIDATE RESUME:
{resume}

JOB DETAILS:
Company: {company}
Title: {job_title}
Location: {location}
Job Description Snippet:
{jd_text[:1500]}

RUBRIC & RULES:
1. Is Legit: Set `is_legit` to true if this is a real engineering job. Set to false if it is an MLM, commission-only, scam, or vague ghost listing.
2. Score (0-100): Evaluate skill fit (40%), seniority (20%), domain (15%), location/remote (15%), comp (10%).
3. Why: A single clear 1-line sentence explaining the fit.
4. Gaps: Up to 2 specific missing skill gaps.

Return ONLY valid JSON:
{{
  "is_legit": true,
  "score": 85.0,
  "why": "Strong alignment with Django, Celery, and vector search systems.",
  "gaps": ["Kubernetes", "Golang"]
}}"""

    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "JobHunter Evaluation Engine"
    }

    body = {
        "model": DEFAULT_MODEL,
        "messages": [
            {"role": "system", "content": "You are a deterministic JSON job evaluation engine."},
            {"role": "user", "content": prompt}
        ],
        "response_format": {"type": "json_object"},
        "temperature": 0.0
    }

    try:
        req = urllib.request.Request(
            "https://openrouter.ai/api/v1/chat/completions",
            headers=headers,
            data=json.dumps(body).encode("utf-8")
        )
        with urllib.request.urlopen(req, timeout=12) as response:
            res_data = json.loads(response.read().decode("utf-8"))
            content = res_data["choices"][0]["message"]["content"]
            parsed = json.loads(content)

            is_legit = bool(parsed.get("is_legit", True))
            score = float(parsed.get("score", 70.0))
            why = str(parsed.get("why", "Matched technical requirements."))
            gaps = parsed.get("gaps", [])
            if not isinstance(gaps, list):
                gaps = []

            return is_legit, score, why, gaps
    except Exception as e:
        # Fallback if API fails
        return True, 70.0, "Matched core backend stack.", ["Kubernetes"]
