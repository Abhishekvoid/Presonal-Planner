import os
from pathlib import Path
from dotenv import load_dotenv

# Base directory
BASE_DIR = Path(__file__).resolve().parent

# Load .env from jobhunter/.env or root .env
load_dotenv(BASE_DIR / ".env")
load_dotenv(BASE_DIR.parent / ".env")

# API Keys
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
HUNTER_API_KEY = os.getenv("HUNTER_API_KEY", "")

# Paths
DB_PATH = BASE_DIR / "jobs.db"
RESUME_PATH = BASE_DIR / "resume.md"
COMPANIES_PATH = BASE_DIR / "companies.txt"
OUTPUT_DIR = BASE_DIR / "output"
OUTPUT_CSV = OUTPUT_DIR / "daily_feed.csv"

# Configuration parameters
SCORE_THRESHOLD = 70.0
MAX_HUNTER_LOOKUPS_PER_RUN = 5
DEFAULT_MODEL = "deepseek/deepseek-v4-flash"
