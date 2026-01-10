import asyncio
import json
import os
import glob
from evaluator_engine import EvaluatorEngine
from utils import log_step

def load_json(path):
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)

def get_latest_profile():
    files = glob.glob("output/master_profile_*.json")
    if not files: return None
    return max(files, key=os.path.getctime)

async def main():
    verifier = EvaluatorEngine()
    
    # 1. Load Data
    resume_path = "resume_data.json"
    if not os.path.exists(resume_path):
        log_step("ERR", "resume_data.json not found!")
        return

    profile_path = get_latest_profile()
    if not profile_path:
        log_step("ERR", "No master_profile output found!")
        return

    log_step("FNR", f"Loading Resume: {resume_path}")
    log_step("FNR", f"Loading Portfolio: {profile_path}")
    
    resume_data = load_json(resume_path)
    portfolio_data = load_json(profile_path)
    
    # Normalize Resume Projects
    # Resume data might be nested under "sections" -> "projects" per previous turn
    resume_projects = resume_data.get("sections", {}).get("projects", [])
    if not resume_projects:
        resume_projects = resume_data.get("projects", []) # Fallback
        
    portfolio_projects = portfolio_data.get("projects", [])
    
    results = {
        "portfolio_url": portfolio_data.get("portfolio_url"),
        "project_evaluations": []
    }
    
    tasks = []
    
    log_step("PLAN", f"Evaluating {len(portfolio_projects)} projects...")
    
    for proj in portfolio_projects:
        # We run checks concurrently for each project
        async def evaluate_single(p):
            # A. Live Check / AI Awareness
            live_status = {"is_alive": False, "status": "No Link"}
            
            target_url = p.get("live_link")
            is_ai = False
            
            # If no direct live link, check repo for AI platforms
            if not target_url and p.get("repo_link"):
                repo = p.get("repo_link").lower()
                ai_domains = ["colab.research.google.com", "huggingface.co", "arxiv.org"]
                if any(d in repo for d in ai_domains):
                    target_url = p.get("repo_link")
                    is_ai = True
            
            if target_url:
                live_status = await verifier.check_live_deployment(target_url)
                if is_ai and live_status["is_alive"]:
                    live_status["status"] = "AI/Notebook Deployment"
            
            # B. Quality Judge (LLM)
            loop = asyncio.get_event_loop()
            quality = await loop.run_in_executor(None, verifier.evaluate_project_quality, p)
            
            # C. Consistency (LLM)
            consistency = await loop.run_in_executor(None, verifier.verify_consistency, resume_projects, p)
            
            # D. Refined Verdict Logic (Hidden Gem Thresholds)
            comp_score = quality.get("complexity_score", 0)
            
            final_verdict = consistency.get("verdict")
            
            if consistency.get("match_status") == "unique_to_portfolio":
                if comp_score >= 4:
                    final_verdict = "💎 Hidden Gem"
                elif comp_score == 3:
                    final_verdict = "➕ Bonus Project"
                else:
                    final_verdict = "⚪ Ignore/Fluff"
                    
            consistency["verdict"] = final_verdict
            
            return {
                "project": p.get("title"),
                "live_check": live_status,
                "quality_score": quality,
                "resume_verification": consistency
            }
            
        tasks.append(evaluate_single(proj))
        
    evaluations = await asyncio.gather(*tasks)
    results["project_evaluations"] = evaluations
    
    # Save Report
    output_path = "output/evaluation_report.json"
    with open(output_path, "w", encoding='utf-8') as f:
        json.dump(results, f, indent=2)
        
    log_step("SAVE", f"Evaluation Report saved to {output_path}")
    
    # Print Summary to Console
    print("\n--- EVALUATION SUMMARY ---")
    for ev in evaluations:
        print(f"\n[Project] {ev['project']}")
        live = ev['live_check']
        status_icon = '✅' if live['is_alive'] else '❌'
        print(f"  - Deployment: {status_icon} ({live.get('status')})")
        
        q = ev['quality_score']
        print(f"  - Quality: Complexity {q.get('complexity_score')}/5 | Clarity {q.get('clarity_score')}/5")
        
        c = ev['resume_verification']
        print(f"  - Verdict: {c.get('verdict')}")

if __name__ == "__main__":
    asyncio.run(main())
