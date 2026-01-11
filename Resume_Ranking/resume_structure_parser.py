import json
from typing import Dict
from jsonschema import validate, ValidationError
from openai import OpenAI
from dotenv import load_dotenv
import os

load_dotenv('../.env')

client = OpenAI(
    base_url=os.getenv("OPENAI_BASE_URL", "https://openrouter.ai/api/v1"),
    api_key=os.getenv("OPENROUTER_API_KEY")
)
# -----------------------------------
# JSON Schema
# -----------------------------------

RESUME_SCHEMA = {
    "type": "object",
    "properties": {
        "summary": {"type": "string"},
        "skills": {"type": "array", "items": {"type": "string"}},
        "experience": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "title": {"type": "string"},
                    "company": {"type": "string"},
                    "duration_months": {"type": ["number", "null"]},
                    "bullets": {"type": "array", "items": {"type": "string"}}
                },
                "required": ["title", "company", "bullets"]
            }
        },
        "projects": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "name": {"type": "string"},
                    "description": {"type": "string"},
                    "tech": {"type": "array", "items": {"type": "string"}}
                },
                "required": ["name", "description"]
            }
        },
        "education": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "degree": {"type": "string"},
                    "field": {"type": "string"},
                    "institution": {"type": "string"},
                    "cgpa": {"type": "number"}
                },
                "required": ["degree", "institution"]
            }
        },
        "certifications": {
            "type": "array",
            "items": {"type": "string"}
        }
    },
    "required": ["summary", "skills", "experience", "education"]
}

# -----------------------------------
# LLM Prompt
# -----------------------------------

SYSTEM_PROMPT = f"""
You are an expert resume parser specializing in technical AI/ML/software engineering roles.
Your task is to extract structured information from a resume and output it STRICTLY in the following JSON schema:
{json.dumps(RESUME_SCHEMA, indent=2)}

**Critical Instructions for the "projects[].tech" field:**
- ALWAYS populate the "tech" array for every project, even if the resume does not have an explicit "tech" section for that project.
- Infer technologies DIRECTLY from the project description. Look for:
  - Specific libraries, frameworks, and tools (e.g., PyTorch, TensorFlow, Streamlit, LangChain, Playwright)
  - Platforms and services (e.g., AWS SageMaker, Google Calendar API, Weight & Biases, MLflow)
  - Algorithms or architectures (e.g., EfficientAD, CLIP, GRPO, PLOVAD, visual anomaly detection)
  - Model names ONLY when they are part of the implementation stack (e.g., "Gemma 3 1B", "LLaMa 3.2 3B", "Qwen 2.5 3B" — include these because they were fine-tuned)
  - Programming languages if explicitly mentioned (e.g., Python, JavaScript)
- DO NOT include vague terms like "AI", "machine learning", "deep learning", or "automation" unless tied to a specific tool or method.
- DO NOT invent technologies. Only extract what is reasonably inferable from the text.
- The "tech" field must be an array of short, concrete technology names (1–3 words each).

**General Rules:**
1. "Objective" or "Profile" in the resume maps to "summary".
2. If a required field (e.g., "experience", "projects") is missing in the input, return an empty list [] — never omit the key.
3. Never fabricate information. If something is unclear, err on the side of omission.
4. Output valid JSON only — no explanations, no markdown, no extra keys.

Now parse the following resume text:
"""

# -----------------------------------
# Parser Function
# -----------------------------------

def parse_resume_structure(text: str, max_retries: int = 2) -> Dict:
    for attempt in range(max_retries + 1):
        response = client.chat.completions.create(
            model="gpt-4.1-mini",
            temperature=0,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": text}
            ]
        )

        raw_output = response.choices[0].message.content.strip()
        # print(f"DEBUG: Raw output from LLM:\n{raw_output}\n-------------------")

        try:
            parsed = json.loads(raw_output)
            validate(instance=parsed, schema=RESUME_SCHEMA)
            return parsed
        except (json.JSONDecodeError, ValidationError):
            if attempt == max_retries:
                raise RuntimeError("Failed to parse resume into schema")

    raise RuntimeError("Unreachable")

# -----------------------------------
# Example Usage
# -----------------------------------

if __name__ == "__main__":
    with open("ATS Resume.txt", "r", encoding="utf-8") as f:
        resume_text = f.read()

    structured = parse_resume_structure(resume_text)
    print(json.dumps(structured, indent=2))
