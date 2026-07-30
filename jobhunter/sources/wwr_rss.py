import urllib.request
import xml.etree.ElementTree as ET
from typing import List, Dict, Any

def fetch_wwr_rss_jobs() -> List[Dict[str, Any]]:
    """Polls WeWorkRemotely RSS feeds."""
    url = "https://weworkremotely.com/categories/remote-programming-jobs.rss"
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            xml_data = response.read()
            root = ET.fromstring(xml_data)
            output = []
            channel = root.find("channel")
            if channel is not None:
                for item in channel.findall("item"):
                    title = item.findtext("title", "")
                    link = item.findtext("link", "")
                    desc = item.findtext("description", "")
                    pub_date = item.findtext("pubDate", "")

                    # Extract company name if titled like "Company: Role"
                    company = "Remote Company"
                    if ":" in title:
                        parts = title.split(":", 1)
                        company = parts[0].strip()
                        title = parts[1].strip()

                    output.append({
                        "source": "weworkremotely",
                        "external_id": link,
                        "title": title,
                        "company": company,
                        "location": "Global Remote",
                        "is_remote": True,
                        "description": desc,
                        "apply_url": link,
                        "posted_at": pub_date,
                    })
            return output
    except Exception:
        return []
