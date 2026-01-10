import json
from typing import Dict
from jsonschema import validate, ValidationError
from openai import OpenAI
from dotenv import load_dotenv
import os

load_dotenv()

client = OpenAI(base_url=os.getenv("OPENAI_BASE_URL"), api_key=os.getenv("OPENAI_API_KEY"))

# -----------------------------------
# Job Description Schema
# -----------------------------------

JOB_SCHEMA = {
    "type": "object",
    "properties": {
        "role_level": {
            "type": "string",
            "enum": ["junior", "mid", "senior", "staff", "lead"]
        },
        "experience": {
            "type": "object",
            "properties": {
                "min_years": {"type": ["number", "null"]},
                "max_years": {"type": ["number", "null"]}
            },
            "required": ["min_years", "max_years"]
        },
        "skills": {
            "type": "object",
            "properties": {
                "core": {
                    "type": "object",
                    "properties": {
                        "technical": {"type": "array", "items": {"type": "string"}},
                        "languages": {"type": "array", "items": {"type": "string"}},
                        "tools_platforms": {"type": "array", "items": {"type": "string"}}
                    },
                    "required": ["technical", "languages", "tools_platforms"]
                },
                "optional": {
                    "type": "object",
                    "properties": {
                        "technical": {"type": "array", "items": {"type": "string"}},
                        "tools_platforms": {"type": "array", "items": {"type": "string"}},
                        "soft_skills": {"type": "array", "items": {"type": "string"}}
                    },
                    "required": ["technical", "tools_platforms", "soft_skills"]
                }
            },
            "required": ["core", "optional"]
        },
        "responsibilities": {
            "type": "array",
            "items": {"type": "string"}
        },
        "deal_breakers": {
            "type": "array",
            "items": {"type": "string"}
        }
    },
    "required": [
        "role_level",
        "experience",
        "skills",
        "responsibilities",
        "deal_breakers"
    ]
}

# -----------------------------------
# Prompt
# -----------------------------------

SYSTEM_PROMPT = f"""
You are a job description canonicalization system for an automated resume screener.

Your task:
- Extract and structure requirements from ANY job description (software, data, product, design, DevOps, etc.).
- Output STRICTLY valid JSON matching the schema below.

SCHEMA:
{json.dumps(JOB_SCHEMA, indent=2)}

INSTRUCTIONS:

1. **Role Level**: Infer from titles/phrases:
   - "Junior", "Entry-level" → "junior"
   - "Mid", "Intermediate" → "mid"
   - "Senior", "Experienced" → "senior"
   - "Staff", "Principal" → "staff"
   - "Lead", "Engineering Manager" → "lead"

2. **Experience (years)**:
   - Extract numeric ranges (e.g., "3–5 years" → min=3, max=5).
   - If only "5+ years", set min=5, max=null.
   - If unspecified, set both to null.

3. **Skills**:
   - **Core**: Skills explicitly required or strongly implied as mandatory.
   - **Optional**: "Nice-to-have", "preferred", "bonus if you know".
   - Categorize as follows:
     - `technical`: Methods, frameworks, paradigms, algorithms, systems (e.g., "REST APIs", "React", "Kubernetes", "SQL", "Agile")
     - `languages`: Programming or natural languages (e.g., "Python", "JavaScript", "Mandarin")
     - `tools_platforms`: Software, services, cloud platforms, IDEs (e.g., "Docker", "AWS", "Jira", "Figma", "TensorFlow")
     - `soft_skills`: Communication, leadership, teamwork, etc. (ONLY in optional)

4. **Responsibilities**: Action-oriented duties (start with verbs: "Build...", "Lead...", "Design...").

5. **Deal Breakers**:
   - Include ONLY hard requirements explicitly labeled as "MUST HAVE", "REQUIRED", "NON-NEGOTIABLE", etc.
   - Phrase them as clear, positive statements (e.g., "Experience with Kubernetes").
   - Do NOT include implied or optional skills, even if important.
   - Do NOT negate them — your system will check for their absence.


RULES:
- NEVER invent skills. Only extract or reasonably infer from context.
- Be domain-agnostic: do NOT assume ML/AI unless stated.
- Return ONLY valid JSON. No markdown, no comments, no extra fields.
"""

# -----------------------------------
# Parser Function
# -----------------------------------

def parse_job_description(jd_text: str, max_retries: int = 2) -> Dict:
    for attempt in range(max_retries + 1):
        response = client.chat.completions.create(
            model="gpt-4.1-mini",
            temperature=0,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": jd_text}
            ]
        )

        raw_output = response.choices[0].message.content.strip()
        
        # Clean markdown fences
        if raw_output.startswith("```json"):
            raw_output = raw_output[7:]
        if raw_output.startswith("```"):
            raw_output = raw_output[3:]
        if raw_output.endswith("```"):
            raw_output = raw_output[:-3]
        
        raw_output = raw_output.strip()

        try:
            parsed = json.loads(raw_output)
            validate(instance=parsed, schema=JOB_SCHEMA)
            return parsed
        except (json.JSONDecodeError, ValidationError):
            if attempt == max_retries:
                raise RuntimeError("JD parsing failed schema validation")

    raise RuntimeError("Unreachable")


if __name__ == "__main__":
    jd_text = """
    An AI engineer designs, builds, and deploys artificial intelligence systems.
    They integrate ML models, develop intelligent systems, optimise model performance, and deploy AI via APIs or microservices.
    Key responsibilities:
    - Designing AI systems using deep learning, reinforcement learning, or rule-based logic
    - Developing APIs and microservices for model serving
    - Implementing pipelines for feature engineering and retraining
    - Supporting experimentation, monitoring, and model deployment
    - Using tools like Python, TensorFlow, Keras, MLFlow
    - Deploying on AWS, SageMaker, Azure ML, Vertex AI Skills and requirements:
    - 4–7 years experience in AI/ML roles
    - Experience deploying ML or deep learning models
    - Familiarity with MLOps, real-time systems, cloud platforms
    - Strong communication and documentation skills

    MUST HAVE: 
    - Experience deploying ML or deep learning models
    - Familiarity with MLOps, real-time systems, cloud platforms
    """
    print(parse_job_description(jd_text))