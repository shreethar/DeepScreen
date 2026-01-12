import json
import os
import time
from pathlib import Path
from typing import Dict, List
from jsonschema import validate
from openai import OpenAI, RateLimitError
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

client = OpenAI(
    base_url=os.getenv("OPENAI_BASE_URL", "https://openrouter.ai/api/v1"),
    api_key=os.getenv("OPENROUTER_API_KEY")
)

MODEL = os.getenv("MODEL_NAME", "google/gemini-2.0-flash-001")

# Detailed Schemas for deep structural analysis
RESUME_SCHEMA = {
    "type": "object",
    "properties": {
        "summary": {"type": ["string", "null"]},
        "portfolio_url": {"type": ["string", "null"]},
        "skills": {"type": "array", "items": {"type": "string"}},
        "experience": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "title": {"type": ["string", "null"]},
                    "company": {"type": ["string", "null"]},
                    "date_range": {"type": ["string", "null"]},
                    "description": {"type": ["string", "null"]}
                },
                "required": ["title"]
            }
        },
        "education": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "degree": {"type": ["string", "null"]},
                    "course": {"type": ["string", "null"]},
                    "year": {"type": ["string", "null"]},
                    "institution": {"type": ["string", "null"]}
                }
            }
        },
        "projects": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "title": {"type": ["string", "null"]},
                    "description": {"type": ["string", "null"]},
                    "tech_stack": {"type": "array", "items": {"type": "string"}},
                    "repo_link": {"type": ["string", "null"]},
                    "live_link": {"type": ["string", "null"]}
                }
            }
        },
        "certifications": {"type": "array", "items": {"type": "string"}}
    },
    "required": ["summary", "skills"]
}

def enforce_defaults(obj):
    """Recursively replaces None with defaults."""
    if isinstance(obj, dict):
        for k, v in obj.items():
            if v is None:
                if k in ["duration", "min_experience_years"]:
                    obj[k] = 0.0
                elif k in ["tech_stack", "skills", "certifications", "experience", "projects", "education"]:
                    obj[k] = []
                else:
                    obj[k] = ""
            else:
                enforce_defaults(v)
    elif isinstance(obj, list):
        for item in obj:
            enforce_defaults(item)
    return obj

def call_llm_with_retry(messages, schema):
    """Reliable LLM caller with JSON schema validation."""
    for _ in range(3):
        try:
            res = client.chat.completions.create(model=MODEL, messages=messages, response_format={"type": "json_object"}, temperature=0)
            data = json.loads(res.choices[0].message.content)
            validate(instance=data, schema=schema)
            return enforce_defaults(data)
        except RateLimitError: time.sleep(2)
        except Exception as e: print(f"Parser Error: {e}")
    return None

JD_SCHEMA = {
    "type": "object",
    "properties": {
        "title": {"type": ["string", "null"]},
        "skills": {"type": "array", "items": {"type": "string"}},
        "min_experience_years": {"type": ["number", "null"]},
        "education": {
            "type": "object",
            "properties": {
                "degree": {"type": ["string", "null"]},
                "course": {"type": "array", "items": {"type": "string"}}
            }
        },
        "certifications": {"type": "array", "items": {"type": "string"}},
        "description": {"type": ["string", "null"]}
    },
    "required": ["title", "skills", "description"]
}

def parse_jd(text: str) -> Dict:
    """Extracts job requirements into structured JSON matching the defined schema."""
    msg = [
        {"role": "system", "content": f"You are a Job Description Parser. Extract details from the text into this JSON schema: {json.dumps(JD_SCHEMA)}.  IMPORTANT: Return ONLY instances of the data, do not return the schema definition itself. For missing numerical values (e.g. min_experience_years), default to 0. For missing string values, default to empty string \"\"."},
        {"role": "user", "content": text}
    ]
    return call_llm_with_retry(msg, JD_SCHEMA)

def parse_resume(text: str, jd_context: str, links: List[str]) -> Dict:
    """Parses resume with Skill Inference logic to auto-populate missing technical keywords."""
    system_instr = (
        "You are a Technical Talent Auditor. Extract resume details into JSON. "
        "SKILL INFERENCE: If a technology (e.g. FastAPI) is in projects/experience but missing from skills array, you MUST add it to 'skills'. "
        "RULES FOR DATES: Convert ALL dates to 'MonthName YYYY - MonthName YYYY'. "
        "If currently working, use 'Present'. Do NOT calculate duration numbers. "
        "RULES FOR EDUCATION: Split 'degree' (e.g. Bachelor's) and 'course' (e.g. Computer Science). "
        "Use detected links to enrich 'repo_link', 'live_link', or 'portfolio_url' if applicable. Detected links: " + str(links) + ". "
        "For experience duration, calculate in years (float). "
        "If portfolio URL is not found, return \"\". "
    )
    msg = [{"role": "system", "content": system_instr},
           {"role": "user", "content": f"JD Context: {jd_context}\n\nResume: {text}\n\nSchema: {json.dumps(RESUME_SCHEMA)}"}]
    return call_llm_with_retry(msg, RESUME_SCHEMA)
