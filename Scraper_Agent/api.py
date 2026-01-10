from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Union, Any
from integration_pipeline import IntegrationPipeline
import uvicorn
import asyncio
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="AI Resume Auditor API", version="1.0")

# Add this middleware block
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"], # Add your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class Project(BaseModel):
    title: str
    description: str
    tech_stack: List[str]
    live_link: Optional[str] = None
    repo_link: Optional[str] = None

class Experience(BaseModel):
    title: str
    duration: Union[str, float, int]
    description: str

class Education(BaseModel):
    degree: str
    course: str
    year: str

class ResumeData(BaseModel):
    summary: Optional[str] = None
    skills: List[str] = []
    portfolio_url: str
    projects: List[Project]
    experience: List[Experience]
    education: List[Education] = []
    certifications: List[Any] = []

@app.post("/audit")
async def audit_candidate(resume: ResumeData):
    """
    Audits a candidate by cross-referencing Resume vs Portfolio vs Code.
    Returns highly structured verification data.
    """
    pipeline = IntegrationPipeline()
    
    # Convert Pydantic model to Dict
    resume_dict = resume.model_dump()
    
    try:
        # Run the full pipeline
        # Note: This is a heavy operation (crawling + multiple LLM calls).
        # In production, this should be a background task (Celery/Bull).
        # For this prototype, we await it directly (timeout risk if > 60s).
        report = await pipeline.audit_candidate(resume_dict)
        
        if "error" in report:
            raise HTTPException(status_code=500, detail=report["error"])
            
        return report
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
