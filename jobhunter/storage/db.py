import sqlite3
import json
from pathlib import Path
from typing import Optional, Dict, Any, List
from jobhunter.config import DB_PATH

def get_connection() -> sqlite3.Connection:
    """Returns a connection to jobhunter/jobs.db."""
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Initializes jobs and contacts SQLite tables."""
    conn = get_connection()
    cursor = conn.cursor()

    # Jobs Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS jobs (
        hash TEXT PRIMARY KEY,
        source TEXT NOT NULL,
        external_id TEXT,
        title TEXT NOT NULL,
        company TEXT NOT NULL,
        location TEXT,
        is_remote INTEGER DEFAULT 0,
        description TEXT NOT NULL,
        apply_url TEXT NOT NULL,
        posted_at TEXT,
        ingested_at TEXT NOT NULL,
        is_legit INTEGER,
        score REAL,
        why TEXT,
        gaps TEXT,
        surfaced_at TEXT
    );
    """)

    # Contacts Cache Table (keyed by company_name)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS contacts (
        company_name TEXT PRIMARY KEY,
        contact_name TEXT,
        contact_role TEXT,
        contact_email TEXT,
        confidence_score INTEGER,
        fetched_at TEXT NOT NULL
    );
    """)

    conn.commit()
    conn.close()

def get_job_by_hash(job_hash: str) -> Optional[Dict[str, Any]]:
    """Checks if a job hash exists in the database."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM jobs WHERE hash = ?", (job_hash,))
    row = cursor.fetchone()
    conn.close()
    if row:
        return dict(row)
    return None

def save_job(job_data: Dict[str, Any]):
    """Saves or updates a job row in SQLite."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
    INSERT INTO jobs (
        hash, source, external_id, title, company, location, is_remote,
        description, apply_url, posted_at, ingested_at, is_legit, score, why, gaps, surfaced_at
    ) VALUES (
        :hash, :source, :external_id, :title, :company, :location, :is_remote,
        :description, :apply_url, :posted_at, :ingested_at, :is_legit, :score, :why, :gaps, :surfaced_at
    )
    ON CONFLICT(hash) DO UPDATE SET
        score=COALESCE(excluded.score, jobs.score),
        is_legit=COALESCE(excluded.is_legit, jobs.is_legit),
        why=COALESCE(excluded.why, jobs.why),
        gaps=COALESCE(excluded.gaps, jobs.gaps),
        surfaced_at=COALESCE(excluded.surfaced_at, jobs.surfaced_at);
    """, job_data)
    conn.commit()
    conn.close()

def get_contact_by_company(company_name: str) -> Optional[Dict[str, Any]]:
    """Fetches cached Hunter contact for a company."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM contacts WHERE LOWER(company_name) = LOWER(?)", (company_name.strip(),))
    row = cursor.fetchone()
    conn.close()
    if row:
        return dict(row)
    return None

def save_contact(company_name: str, contact_name: str, contact_role: str, contact_email: str, confidence: int):
    """Saves a company contact to SQLite cache."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
    INSERT INTO contacts (company_name, contact_name, contact_role, contact_email, confidence_score, fetched_at)
    VALUES (?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(company_name) DO UPDATE SET
        contact_name=excluded.contact_name,
        contact_role=excluded.contact_role,
        contact_email=excluded.contact_email,
        confidence_score=excluded.confidence_score,
        fetched_at=datetime('now');
    """, (company_name.strip(), contact_name, contact_role, contact_email, confidence))
    conn.commit()
    conn.close()

def mark_jobs_surfaced(job_hashes: List[str]):
    """Stamps surfaced_at = CURRENT_TIMESTAMP for exported jobs."""
    if not job_hashes:
        return
    conn = get_connection()
    cursor = conn.cursor()
    cursor.executemany(
        "UPDATE jobs SET surfaced_at = datetime('now') WHERE hash = ?",
        [(h,) for h in job_hashes]
    )
    conn.commit()
    conn.close()
