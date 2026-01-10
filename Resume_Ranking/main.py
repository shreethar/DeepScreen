import os, asyncio, json
from fastapi import FastAPI, UploadFile, File, Form, Body
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict, Any

from file_loader import ingest_resume
from ats_parsers import parse_jd, parse_resume
from scoring import check_hard_constraints, calculate_hybrid_score
from llm_ranking import compare_two_candidates, generate_explanation, rank_candidates_with_mergesort

app = FastAPI(title="Gen4 High-Performance ATS")
semaphore = asyncio.Semaphore(10)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# Reuseable Pipeline Helper
async def process_resume_files(files: List[UploadFile], jd_text: str, jd_data: dict, jd_summary: str):
    """Core pipeline: Ingest -> Parse -> Score"""
    
    async def process_task(file: UploadFile):
        async with semaphore:
            temp_path = f"temp_{file.filename}"
            # Ensure we read file content safely. If file is closed/seeked, it might need management.
            # Best practice: read into bytes immediately if fitting in RAM, or manage temp files carefully.
            content = await file.read()
            with open(temp_path, "wb") as buffer: buffer.write(content)
            
            try:
                ingested = ingest_resume(temp_path)
                resume_data = parse_resume(ingested["text"], jd_summary, ingested["links"])
                
                # Check constraints
                constraint = check_hard_constraints(resume_data, jd_data)
                
                # Calculate scores
                scores = calculate_hybrid_score(resume_data, jd_data)
                
                return {
                    "filename": file.filename, 
                    "status": "QUALIFIED" if constraint["pass"] else "REJECTED", 
                    "logic_reason": constraint["reason"], 
                    "rank_score": scores["total_score"], 
                    "breakdown": scores["breakdown"], 
                    "extracted_data": resume_data
                }
            except Exception as e: return {"filename": file.filename, "error": str(e)}
            finally: 
                if os.path.exists(temp_path): os.remove(temp_path)

    tasks = [process_task(f) for f in files]
    results = await asyncio.gather(*tasks)
    return results

# Endpoint 1: Hybrid Score Only (Batch)
@app.post("/score-candidates/")
async def score_candidates(job_description: str = Form(...), files: List[UploadFile] = File(...)):
    print(f"🚀 Endpoint 1: Scoring {len(files)} resumes...")
    jd_data = parse_jd(job_description)
    jd_summary = f"{jd_data.get('title')} ({jd_data.get('min_experience_years')}y exp)"
    
    results = await process_resume_files(files, job_description, jd_data, jd_summary)
    
    # Simple semantic sort (descending)
    qualified = sorted([r for r in results if r.get("status") == "QUALIFIED"], key=lambda x: x["rank_score"], reverse=True)
    rejected = [r for r in results if r.get("status") == "REJECTED"]
    
    return qualified + rejected

# Endpoint 2: Rerank with SPPR (Top 10)
@app.post("/rerank-candidates/")
async def rerank_candidates(job_description: str = Form(...), files: List[UploadFile] = File(...)):
    print(f"🚀 Endpoint 2: SPPR Reranking {len(files)} resumes...")
    jd_data = parse_jd(job_description)
    jd_summary = f"{jd_data.get('title')} ({jd_data.get('min_experience_years')}y exp)"
    
    # 1. Process & Score (Seed Sort)
    results = await process_resume_files(files, job_description, jd_data, jd_summary)
    qualified = sorted([r for r in results if r.get("status") == "QUALIFIED"], key=lambda x: x["rank_score"], reverse=True)
    
    # 2. Apply LLM Merge Sort Reranking to Qualified Candidates
    if len(qualified) > 1:
        qualified = await rank_candidates_with_mergesort(qualified, jd_summary)
        
    # 3. Assign Final Rank
    for idx, r in enumerate(qualified, 1):
        r['final_rank'] = idx
        
    rejected = [r for r in results if r.get("status") == "REJECTED"]
    return qualified + rejected

# Endpoint 3: Explanation (Input JSON)
@app.post("/explain-candidate/")
async def explain_candidate(
    job_description: str = Body(...), 
    candidate_data: Dict[str, Any] = Body(...)
):
    print(f"🚀 Endpoint 3: Explaining {candidate_data.get('filename')}...")
    # Clean JD summary
    jd_data = parse_jd(job_description)
    jd_summary = f"{jd_data.get('title')} ({jd_data.get('min_experience_years')}y exp)"
    
    reasoning = await generate_explanation(candidate_data, jd_summary)
    return {
        "filename": candidate_data.get("filename"), 
        "ai_explanation": reasoning
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8002)