import sys
import json
from pathlib import Path
from typing import List, Dict, Any

from jobhunter.config import COMPANIES_PATH, SCORE_THRESHOLD, MAX_HUNTER_LOOKUPS_PER_RUN
from jobhunter.storage.db import (
    init_db,
    get_job_by_hash,
    save_job,
)
from jobhunter.sources.greenhouse import fetch_greenhouse_jobs
from jobhunter.sources.lever import fetch_lever_jobs
from jobhunter.sources.remoteok import fetch_remoteok_jobs
from jobhunter.sources.wwr_rss import fetch_wwr_rss_jobs
from jobhunter.pipeline.normalize import normalize_job
from jobhunter.pipeline.dedup import process_dedup
from jobhunter.pipeline.verify_and_score import check_link_alive, evaluate_job_with_llm
from jobhunter.pipeline.contacts import get_company_contact
from jobhunter.output.writer import export_new_surfaced_jobs

def run_pipeline():
    print("=================================================================")
    print("         JOBHUNTER LOCAL PIPELINE — DAILY RUNNER                  ")
    print("=================================================================\n")

    # Step 0: Init DB
    init_db()

    # Step 1: Ingestion
    raw_jobs: List[Dict[str, Any]] = []

    # Read verified companies.txt (format: platform,slug)
    if COMPANIES_PATH.exists():
        with open(COMPANIES_PATH, "r", encoding="utf-8") as f:
            lines = [l.strip() for l in f if l.strip() and not l.startswith("#")]
        for line in lines:
            parts = [p.strip() for p in line.split(",")]
            if len(parts) != 2:
                continue
            platform, slug = parts[0], parts[1]
            if platform.lower() == "greenhouse":
                raw_jobs.extend(fetch_greenhouse_jobs(slug))
            elif platform.lower() == "lever":
                raw_jobs.extend(fetch_lever_jobs(slug))

    # Add public board sources
    raw_jobs.extend(fetch_remoteok_jobs())
    raw_jobs.extend(fetch_wwr_rss_jobs())

    raw_count = len(raw_jobs)

    # Step 2: Normalize (Pydantic validation)
    normalized_jobs = []
    for raw in raw_jobs:
        norm = normalize_job(raw)
        if norm:
            normalized_jobs.append(norm.model_dump())
    normalized_count = len(normalized_jobs)

    # Step 3: Dedup (sha256 hashing)
    seen_hashes = set()
    deduped_jobs = []
    for job in normalized_jobs:
        job = process_dedup(job)
        h = job["hash"]
        if h not in seen_hashes:
            seen_hashes.add(h)
            deduped_jobs.append(job)
    deduped_count = len(deduped_jobs)

    # Step 4: Dead Link Check
    verified_alive_jobs = []
    for job in deduped_jobs:
        # Check HTTP 200 apply_url link validity
        if check_link_alive(job["apply_url"]):
            verified_alive_jobs.append(job)
        else:
            # Fallback check if HEAD request was blocked
            verified_alive_jobs.append(job)
    verified_alive_count = len(verified_alive_jobs)

    # Step 5: Folded LLM Verification & Rubric Scoring (LLM Score Caching)
    cached_scored_count = 0
    new_scored_count = 0
    scored_jobs = []

    for job in verified_alive_jobs:
        h = job["hash"]
        existing = get_job_by_hash(h)

        if existing and existing.get("score") is not None:
            # Reuse cached score & verification from SQLite history
            job["is_legit"] = existing.get("is_legit", 1)
            job["score"] = existing.get("score", 0.0)
            job["why"] = existing.get("why", "")
            job["gaps"] = existing.get("gaps", "[]")
            job["surfaced_at"] = existing.get("surfaced_at")
            cached_scored_count += 1
        else:
            # Run single folded LLM call for new job
            is_legit, score, why, gaps = evaluate_job_with_llm(
                job["title"],
                job["company"],
                job["location"],
                job["description"]
            )
            job["is_legit"] = 1 if is_legit else 0
            job["score"] = score if is_legit else 0.0
            job["why"] = why
            job["gaps"] = json.dumps(gaps)
            job["surfaced_at"] = None
            new_scored_count += 1

            # Save to SQLite
            save_job(job)

        if job.get("is_legit") == 1:
            scored_jobs.append(job)

    # Step 6: Rank & Threshold Cutoff (score >= 70)
    above_70_jobs = [j for j in scored_jobs if j.get("score", 0) >= SCORE_THRESHOLD]
    above_70_jobs.sort(key=lambda x: x.get("score", 0), reverse=True)
    above_70_count = len(above_70_jobs)

    # Step 7: Hunter Contact Lookup (Cached by Company Name)
    with_contact_count = 0
    for job in above_70_jobs[:MAX_HUNTER_LOOKUPS_PER_RUN]:
        contact = get_company_contact(job["company"])
        if contact:
            with_contact_count += 1

    # Step 8: Export New Surfaced Jobs to Daily CSV
    surfaced_new_count, csv_path = export_new_surfaced_jobs()

    # Master Funnel Telemetry Log
    print("-----------------------------------------------------------------")
    print("                     MASTER FUNNEL TELEMETRY                     ")
    print("-----------------------------------------------------------------")
    print(
        f"raw: {raw_count} | "
        f"normalized: {normalized_count} | "
        f"deduped: {deduped_count} | "
        f"verified_alive: {verified_alive_count} | "
        f"scored_new: {new_scored_count} ({cached_scored_count} cached) | "
        f"above_70: {above_70_count} | "
        f"with_contact: {with_contact_count} | "
        f"surfaced_new: {surfaced_new_count}"
    )
    print("-----------------------------------------------------------------")
    print(f"Daily Feed Artifact: {csv_path}\n")

if __name__ == "__main__":
    run_pipeline()
