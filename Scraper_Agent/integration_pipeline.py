import asyncio
import json
import os
import glob
import subprocess
import concurrent.futures
from crawler_engine import CrawlerEngine
from auditor_brain import AuditorBrain
from evaluator_engine import EvaluatorEngine
from utils import log_step

# Reuse the Auditor Brain for GitHub logic
# Reuse the Evaluator Engine for Product/Consistency logic

def load_json(path):
    if not os.path.exists(path): return {}
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_json(path, data):
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2)

class IntegrationPipeline:
    def __init__(self):
        self.crawler = CrawlerEngine()
        self.brain = AuditorBrain()
        self.verifier = EvaluatorEngine()
        
    def select_targets(self, resume_data, portfolio_data, limit=4):
        """
        Selects GitHub Repos to audit based on Resume Priority.
        """
        targets = []
        seen_repos = set()
        
        # 1. Resume Projects (Highest Priority)
        # Try to match Resume 'repo_link' or 'title' to Portfolio data
        resume_projects = resume_data.get("projects", [])
        portfolio_projects = portfolio_data.get("projects", [])
        
        log_step("PLAN", f"Matching {len(resume_projects)} Resume Projects vs {len(portfolio_projects)} Portfolio Projects...")

        for rp in resume_projects:
            # If resume explicitly links a repo, use it
            r_link = rp.get("repo_link")
            if r_link and "github.com" in r_link and r_link not in seen_repos:
                targets.append({
                    "url": r_link,
                    "source": "Resume Claim",
                    "title": rp.get("title")
                })
                seen_repos.add(r_link)
                
        # 2. Portfolio Featured (If slots remain)
        # If we have space, add portfolio projects that look interesting (have live links or good descriptions)
        for pp in portfolio_projects:
            if len(targets) >= limit: break
            
            p_repo = pp.get("repo_link")
            if p_repo and "github.com" in p_repo and p_repo not in seen_repos:
                targets.append({
                    "url": p_repo,
                    "source": "Portfolio Discovery",
                    "title": pp.get("title")
                })
                seen_repos.add(p_repo)
                
        log_step("PLAN", f"Selected {len(targets)} targets for Deep Code Audit.")
        return targets

    async def audit_candidate(self, resume_data: dict):
        """
        Programmatic entry point for API.
        Returns the final report dict with aggregate scores.
        """
        portfolio_url = resume_data.get("portfolio_url")
        if not portfolio_url:
            return {"error": "No portfolio_url provided"}

        # B. SCRAPE PORTFOLIO
        log_step("CRAWL", f"Scraping Portfolio: {portfolio_url}")
        cmd = ["uv", "run", "main.py", "--url", portfolio_url, "--goal", "Full Audit"]
        try:
            # Check if we recently crawled it (heuristic: today)
            # Actually, let's run it to ensure fresh links.
            process = await asyncio.create_subprocess_exec(
                *cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
            )
            stdout, stderr = await process.communicate()
            if process.returncode != 0:
                log_step("ERR", f"Crawler failed: {stderr.decode()}")
                return {"error": "Crawler failed"}
        except Exception as e:
            log_step("ERR", f"Crawler exception: {e}")
            return {"error": str(e)}

        # FIND OUTPUT
        files = glob.glob("output/master_profile_*.json")
        if not files:
            return {"error": "Crawler produced no output"}
        latest_profile_path = max(files, key=os.path.getctime)
        portfolio_data = load_json(latest_profile_path)
        
        # C. TARGET SELECTION
        targets = self.select_targets(resume_data, portfolio_data)
        
        # D. PARALLEL AUDIT
        with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
            future_to_url = {}
            for t in targets:
                url = t['url']
                log_step("JUDGE", f"Queueing Code Audit for: {url}")
                audit_cmd = ["uv", "run", "main.py", "--url", url, "--goal", "Evaluate Code Quality"]
                future = executor.submit(subprocess.run, audit_cmd, capture_output=True)
                future_to_url[future] = t
            
            for future in concurrent.futures.as_completed(future_to_url):
                tgt = future_to_url[future]
                try:
                    res = future.result()
                    if res.returncode == 0:
                        log_step("DONE", f"Audit finished: {tgt['url']}")
                    else:
                        log_step("ERR", f"Audit failed for {tgt['url']}")
                except Exception as e:
                    log_step("ERR", f"Exception in audit: {e}")

        # E. MERGE & VERIFY
        all_code_reviews = {}
        recent_files = sorted(glob.glob("output/master_profile_*.json"), key=os.path.getctime, reverse=True)
        
        for fpath in recent_files[:20]: 
            data = load_json(fpath)
            if "code_reviews" in data and data["code_reviews"]:
                p_details_list = data.get("project_details", [])
                if not p_details_list: 
                    continue
                p_details = p_details_list[0]
                repo = p_details.get("repo_link") or ""
                if any(t['url'] in repo for t in targets):
                   all_code_reviews[repo] = data
        
        # Enhance Portfolio Data
        enhanced_projects = []
        for p in portfolio_data.get("projects", []):
            repo_link = p.get("repo_link")
            if repo_link in all_code_reviews:
                review_data = all_code_reviews[repo_link]
                reviews = review_data.get("code_reviews", [])
                if reviews:
                    scores = []
                    for r in reviews:
                        try:
                            s = float(r.get("quality_score", "0").split("/")[0])
                            scores.append(s)
                        except: pass
                    
                    if scores:
                        avg_code_score = sum(scores) / len(scores)
                        p["code_quality_score"] = round(avg_code_score, 2)
                        p["code_critiques"] = [r.get("critique") for r in reviews]
            
            enhanced_projects.append(p)
            
        portfolio_data["projects"] = enhanced_projects
        
        # Run Evaluator Logic
        final_report = {
            "summary": {},
            "results": []
        }
        
        total_code_score = 0
        code_count = 0
        total_product_score = 0
        product_count = 0
        verified_claims = 0
        
        for p in enhanced_projects:
             # Product Check (Live)
             target_url = p.get("live_link") or p.get("repo_link")
             live_status = await self.verifier.check_live_deployment(target_url) if target_url else {"is_alive": False}
             
             # Product Check (Quality)
             quality = self.verifier.evaluate_project_quality(p)
             # Normalize Complexity(5) + Clarity(5) -> 100
             # (Score/10) * 100
             p_score = ((quality.get("complexity_score", 0) + quality.get("clarity_score", 0)) / 10) * 100
             total_product_score += p_score
             product_count += 1
             
             # Consistency Check
             consistency = self.verifier.verify_consistency(resume_data.get("projects", []), p)
             if consistency.get("verdict") in ["supported", "confirmed", "💎 Hidden Gem"]:
                 verified_claims += 1
             
             # Code Score Tracking
             if "code_quality_score" in p:
                 total_code_score += p["code_quality_score"]
                 code_count += 1
             
             entry = {
                 "title": p.get("title"),
                 "deployment": live_status,
                 "product_quality": quality,
                 "code_quality": {
                     "score": p.get("code_quality_score", "N/A"),
                     "details": p.get("code_critiques", [])
                 },
                 "verification": consistency
             }
             final_report["results"].append(entry)
             
        # AGGREGATE SCORES
        avg_code = round(total_code_score / code_count, 2) if code_count > 0 else 0
        avg_product = round(total_product_score / product_count, 1) if product_count > 0 else 0
        # Verification score: (Verified / Total Audited) * 100 ? Or Total Resume Projects?
        # Let's do (Verified / Total Audited) for now.
        ver_score = round((verified_claims / len(final_report["results"])) * 100, 1) if final_report["results"] else 0
        
        final_report["summary"] = {
            "github_code_quality": avg_code,
            "portfolio_product_score": avg_product,
            "resume_verification_score": ver_score
        }
        
        return final_report

    async def run(self, resume_path="resume_data.json"):
        log_step("INIT", "Loading Resume Data...")
        resume_data = load_json(resume_path)
        
        final_report = await self.audit_candidate(resume_data)
        
        if "error" in final_report:
            log_step("ERR", final_report["error"])
            return

        save_json("output/final_integration_report.json", final_report)
        log_step("SUCCESS", "Pipeline Complete. Report: output/final_integration_report.json")
        
        # Print Summary
        print("\n=== FINAL CANDIDATE AUDIT ===")
        summ = final_report.get("summary", {})
        print(f"Stats: Code={summ.get('github_code_quality')}/5 | Product={summ.get('portfolio_product_score')}/100 | Verified={summ.get('resume_verification_score')}%")
        print("-" * 40)
        for res in final_report["results"]:
            print(f"\n[Project] {res['title']}")
            code_score = res['code_quality']['score']
            if code_score != "N/A":
                print(f"  🧑‍💻 Code Quality: {code_score}/5")
            deployed = res['deployment'].get('is_alive')
            status = res['deployment'].get('status', 'Offline')
            print(f"  🚀 Deployment: {'✅' if deployed else '❌'}  ({status})")
            print(f"  ⚖️  Verdict: {res['verification']['verdict']}")

if __name__ == "__main__":
    pipeline = IntegrationPipeline()
    asyncio.run(pipeline.run())
