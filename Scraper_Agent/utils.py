import os
import json
import logging
from datetime import datetime

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - [%(levelname)s] - %(message)s',
    datefmt='%H:%M:%S'
)
logger = logging.getLogger("SOTA_Auditor")

def log_step(phase: str, message: str):
    logger.info(f"[{phase.upper()}] {message}")

def save_json_result(data: dict, filename_prefix: str = "audit_report"):
    if not os.path.exists("output"):
        os.makedirs("output")
        
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"output/{filename_prefix}_{timestamp}.json"
    
    # OUTPUT SCHEMA SEPARATION LOGIC
    is_github_judge = bool(data.get("code_reviews"))
    
    final_data = data.copy()
    
    if is_github_judge:
        # GitHub Code Quality Judge Schema
        # Remove root-level URL as it's redundant with project_details items
        if "portfolio_url" in final_data:
            final_data.pop("portfolio_url")
            
        if "projects" in final_data:
            final_data["project_details"] = final_data.pop("projects")
        if "experience" in final_data:
            final_data.pop("experience")
    else:
        # Portfolio Scraper Schema
        if "code_reviews" in final_data:
            final_data.pop("code_reviews")
    
    with open(filename, "w", encoding="utf-8") as f:
        json.dump(final_data, f, indent=2, ensure_ascii=False)
    
    log_step("SAVE", f"Report saved to {filename}")