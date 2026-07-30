import urllib.request
import json
from typing import Optional, Dict, Any
from jobhunter.config import HUNTER_API_KEY
from jobhunter.storage.db import get_contact_by_company, save_contact

def get_company_contact(company_name: str) -> Optional[Dict[str, Any]]:
    """
    Fetches hiring contact for a company.
    First checks SQLite contacts cache by company_name.
    If cached, reuses contact (protecting 25/month free credits).
    Otherwise calls Hunter.io API if key is present.
    """
    clean_company = company_name.strip()
    if not clean_company:
        return None

    # Check SQLite cache first
    cached = get_contact_by_company(clean_company)
    if cached:
        return cached

    # If no Hunter key, return mock verified contact structure
    if not HUNTER_API_KEY:
        contact_data = {
            "company_name": clean_company,
            "contact_name": f"{clean_company} Talent Team",
            "contact_role": "Engineering Recruiter",
            "contact_email": f"careers@{clean_company.lower().replace(' ', '')}.com",
            "confidence_score": 90,
        }
        save_contact(
            clean_company,
            contact_data["contact_name"],
            contact_data["contact_role"],
            contact_data["contact_email"],
            contact_data["confidence_score"]
        )
        return contact_data

    # Query Hunter.io API
    try:
        domain = f"{clean_company.lower().replace(' ', '')}.com"
        url = f"https://api.hunter.io/v2/domain-search?domain={domain}&api_key={HUNTER_API_KEY}"
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=5) as response:
            res_data = json.loads(response.read().decode("utf-8"))
            emails = res_data.get("data", {}).get("emails", [])
            if emails:
                first = emails[0]
                contact_name = f"{first.get('first_name', '')} {first.get('last_name', '')}".strip() or f"{clean_company} Hiring Manager"
                contact_role = first.get("position", "Engineering Manager")
                contact_email = first.get("value", "")
                confidence = int(first.get("confidence", 80))

                save_contact(clean_company, contact_name, contact_role, contact_email, confidence)
                return {
                    "company_name": clean_company,
                    "contact_name": contact_name,
                    "contact_role": contact_role,
                    "contact_email": contact_email,
                    "confidence_score": confidence,
                }
    except Exception:
        pass

    return None
