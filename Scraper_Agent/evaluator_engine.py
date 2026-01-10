import asyncio
import aiohttp
import json
from typing import Dict, List, Any
from auditor_brain import AuditorBrain
from utils import log_step

class EvaluatorEngine:
    def __init__(self):
        self.brain = AuditorBrain()

    async def check_live_deployment(self, url: str) -> Dict[str, Any]:
        """
        Pings the live link to verify status.
        Returns: { "is_alive": bool, "status": int, "url": str }
        """
        if not url:
            return {"is_alive": False, "status": None, "url": None}
            
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(url, timeout=10) as response:
                    is_alive = 200 <= response.status < 400
                    return {
                        "is_alive": is_alive,
                        "status": response.status,
                        "url": url
                    }
        except Exception as e:
            return {"is_alive": False, "status": str(e), "url": url}

    def evaluate_project_quality(self, project: Dict) -> Dict[str, Any]:
        """
        Uses LLM to score project complexity and clarity (0-5).
        """
        description = project.get("description", "")
        tech_stack = ", ".join(project.get("tech_stack", []))
        title = project.get("title", "Unknown Project")
        
        prompt = f"""
        You are a Technical Hiring Manager. Evaluate this project description based ONLY on technical merit.
        Ignore persuasive language or marketing fluff.
        
        Project: {title}
        Description: {description}
        Tech Stack: {tech_stack}
        
        Score this project on:
        1. Complexity (1-5): Is this a tutorial clone (1) or a custom production app (5)?
           - 1: Hello World / Todo List
           - 3: Standard CRUD / API Integration
           - 5: Complex Architecture / AI / Real-time / Scalable
           
        2. Clarity (1-5): Is this clearly structured for a TECHNICAL PEER?
           - 1: Vague or confusing
           - 5: Clear architecture, problem definition, and solution. Technical density is GOOD.
           
        Return JSON STRICTLY: {{ "complexity_score": int, "clarity_score": int, "reasoning": "string" }}
        """
        
        # Reuse Brain's resilient LLM caller
        return self.brain._call_llm(prompt)

    def verify_consistency(self, resume_projects: List[Dict], portfolio_project: Dict) -> Dict[str, Any]:
        """
        Checks if the portfolio project supports or contradicts claims in the resume.
        """
        p_title = portfolio_project.get("title", "")
        p_desc = portfolio_project.get("description", "")
        
        # Simple string dump of resume projects for context
        resume_context = json.dumps(resume_projects, indent=2)
        
        prompt = f"""
        I have a list of projects from a candidate's Resume and one specific project from their Portfolio.
        
        RESUME PROJECTS:
        {resume_context}
        
        PORTFOLIO PROJECT TO VERIFY:
        Title: {p_title}
        Description: {p_desc}
        
        TASK:
        1. Does this Portfolio project appear in the Resume? (Match by title or strong semantic similarity).
        2. If YES: Does the portfolio evidence SUPPORT the resume claim? Or is it an exaggeration?
        3. If NO: It is "unique_to_portfolio".
        
        Return JSON STRICTLY:
        {{
            "match_status": "matched" | "unique_to_portfolio",
            "verdict": "supported" | "exaggerated" | "neutral",
            "reasoning": "Brief explanation"
        }}
        """
        
        return self.brain._call_llm(prompt)
