import json
import time
from openai import OpenAI
import concurrent.futures
import math
from typing import List, Dict
from dotenv import load_dotenv
from pathlib import Path
import os

load_dotenv(Path(__file__).resolve().parent / ".env")

from utils import log_step

class AuditorBrain:
    def __init__(self, model_name="openai/gpt-5-mini"): 
        # Note: Using a high-reasoning text model is often faster/cheaper than VLM for 
        # text-heavy navigation logic, but you can swap this back to qwen-vl if you pass images.
        self.client = OpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=os.getenv("OPENROUTER_API_KEY")
        )
        self.model_name = model_name
        # Global limit for concurrent LLM calls
        self._llm_semaphore = concurrent.futures.ThreadPoolExecutor(max_workers=4) 
        # Actually semaphore is better for logic, but since we use ThreadPool inside extract,
        # we can just use a lock or semaphore.
        import threading
        self.sem = threading.Semaphore(4)

    def _call_llm(self, prompt: str) -> dict:
        # Acquire semaphore to respect rate limits
        with self.sem:
            for attempt in range(4): # Retries: 0, 1, 2, 3
                try:
                    response = self.client.chat.completions.create(
                        extra_headers={"X-Title": "Browser Agent"},
                        model=self.model_name,
                        messages=[{"role": "user", "content": prompt}],
                        temperature=0.1,
                        response_format={"type": "json_object"}
                    )
                    content = response.choices[0].message.content
                    
                    if "```" in content:
                        content = content.split("```json")[-1].split("```")[0].strip()
                    return json.loads(content)
                except Exception as e:
                    # Check for rate limit error
                    error_msg = str(e).lower()
                    if "429" in error_msg or "too many requests" in error_msg:
                        wait_time = (2 ** attempt) + 1 # 2, 3, 5, 9s
                        log_step("WARN", f"Rate Limit (429). Waiting {wait_time}s...")
                        time.sleep(wait_time)
                    else:
                        log_step("ERR", f"LLM Call Failed: {e}")
                        time.sleep(1)
            
            # If all retries fail, return EMPTY but log it heavily
            log_step("ERR", "CRITICAL: LLM failed after retries.")
            return {}

    def _get_static_metrics(self, content: str) -> dict:
        """Calculates cheap, deterministic code metrics."""
        lines = content.split('\n')
        loc = len([l for l in lines if l.strip()])
        # Heuristic: Count indentation to guess complexity
        complexity = sum(1 for l in lines if l.startswith('    ') or l.startswith('\t'))
        return {
            "loc": loc,
            "complexity_proxy": complexity # Renamed from estimated (raw indentation count)
        }

    def _is_same_domain(self, link_url: str, root_url: str) -> bool:
        if not root_url: return True
        if link_url.startswith("/") or link_url.startswith("#"): return True
        try:
            from urllib.parse import urlparse
            def get_base(u):
                if "://" not in u: u = "http://" + u
                parsed = urlparse(u)
                return parsed.netloc.replace("www.", "").split(":")[0]
            return get_base(root_url) in get_base(link_url) or get_base(link_url) in get_base(root_url)
        except: return root_url in link_url

    def filter_links(self, goal: str, links: list, root_url: str = None) -> list:
        priority = ["project", "work", "experience", "education", "about", "resume", "cv", "repo", "academics"]
        candidates = []
        # GitHub-specific heuristic: Note code files
        is_github = "github.com" in (root_url or "")
        for l in links:
            if root_url and not self._is_same_domain(l['href'], root_url): continue
            
            # Boost priority for standard portfolio sections
            if any(p in l['text'].lower() or p in l['href'].lower() for p in priority):
                l['priority'] = 'high'
            
            # Boost priority for code files in GitHub
            if is_github:
                # Common source extensions or folder navigation
                code_exts = ['.py', '.js', '.ts', '.tsx', '.go', '.rs', '.java', '.cpp', '.h', '.css', '.html', '.ipynb']
                if any(l['href'].endswith(ext) for ext in code_exts):
                   l['priority'] = 'high'
                
                # Heuristic: If text looks like a file "main.py"
                if any(l['text'].endswith(ext) for ext in code_exts):
                    l['priority'] = 'high'
                if "/tree/" in l['href'] or "/blob/" in l['href']:
                    l['priority'] = 'medium'

            candidates.append(l)
        
        # FIX: Sort candidates by priority to ensure High priority links (like code files)
        # survive the slice even if they are at the bottom of the page.
        def get_priority_score(item):
            p = item.get('priority', 'low')
            if p == 'high': return 3
            if p == 'medium': return 2
            return 1
            
        candidates.sort(key=get_priority_score, reverse=True)
        candidates = candidates[:60]
        prompt = f"""
        Goal: {goal}
        Links: {json.dumps(candidates)}
        Task: Select URLs to visit.
        - Prioritize 'Projects', 'Experience', 'About', 'Resume'.
        - **GENERIC LINKS:** Select 'Learn More', 'View', 'Details', 'Read Case Study' if they likely lead to Project/Work details.
        - If 'Full Audit', visit ALL main profile sections.
        - **IF GITHUB REPO**: Select ONLY significant SOURCE CODE files (e.g. core logic in .py, .js, .ts).
        - **IGNORE**: Images (.png, .jpg), Configs (.json, .lock, .yml, .gitignore), Documentation (unless README), and trivial scripts.
        Return JSON: {{ "selected_urls": ["url1", "url2"] }}
        """
        result = self._call_llm(prompt)
        return result.get("selected_urls", [])
# ...
    def _call_judge(self, code_context: str, language: str = "Code") -> dict:
        """Single LLM Judge call with strict rubric."""
        prompt = f"""
        System Prompt:
        You are a senior technical interviewer.
        Evaluate code quality using a balanced rubric. 
        You must be objective, fair, and EXTREMELY CONCISE.
        
        User Prompt:
        Review the following GitHub repository code.

        Rubric:
        1. Code Quality
        2. Architecture & Design
        3. Readability & Documentation
        4. Security & Best Practices
        # NOTE: Testing is excluded.

        Scoring rules:
        - Each category must be scored from 0 to 5.
        - **Baseline:** Functional, clean code starts at 3/5.
        - **Context-Aware:** Evaluate based on repo type (e.g., do not penalize a small script for missing enterprise patterns like DI or complex error handling).
        - **Fairness:** Only deduct points for actual flaws, not missing "nice-to-haves".
        - Scores must be justified by observable evidence.

        Return JSON:
        {{
          "scores": {{
            "code_quality": number,
            "architecture": number,
            "readability": number,
            "security": number
          }},
          "summary": "STRICT FORMAT: Exactly 4 sentences total. One sentence per category (Code, Arch, Readability, Security). Each sentence under 25 words. Total under 100 words.",
          "confidence": number between 0.0 and 1.0
        }}

        Repository context:
        - Primary language: {language}
        - Code snippets / structure:
        {code_context[:20000]}
        """
        return self._call_llm(prompt)

    def _aggregate_reviews(self, reviews: List[Dict]) -> Dict:
        """Weighted aggregation of multiple judge outputs."""
        if not reviews: return {}
        
        dims = ["code_quality", "architecture", "readability", "security"]
        final_scores = {d: 0.0 for d in dims}
        total_weight = 0.0
        
        # Select the single best summary (highest confidence) to respect the token limit
        # instead of concatenating multiple summaries.
        best_summary = ""
        max_conf = -1.0
        
        for r in reviews:
            weight = r.get("confidence", 0.5)
            scores = r.get("scores", {})
            total_weight += weight
            
            if weight > max_conf:
                max_conf = weight
                best_summary = r.get("summary", "")
            
            for d in dims:
                final_scores[d] += scores.get(d, 0) * weight
                
        # Normalize
        if total_weight > 0:
            for d in dims:
                final_scores[d] = round(final_scores[d] / total_weight, 2)
        
        avg_score = sum(final_scores.values()) / len(dims) if dims else 0
        final_score_5 = round(avg_score, 1) # User requested score out of 5
        
        return {
            "quality_score": f"{final_score_5}/5",
            "detailed_scores": final_scores,
            "critique": best_summary,
            "judge_count": len(reviews)
        }

    def analyze_page_relevance(self, current_url: str, page_content: str, links_on_page: list, goal: str, root_url: str = None) -> dict:
        # Optimization: Heuristic Route for Code Files
        if current_url.endswith(('.py', '.js', '.ts', '.tsx', '.go', '.rs', '.java', '.cpp')):
            log_step("BRAIN", "Heuristic: Obvious code file -> EXTRACT")
            return {"action": "extract"}

        safe_content = page_content[:8000]
        relevant_links = []
        priority_keywords = ["experience", "projects", "work", "resume", "about"]
        
        for l in links_on_page:
            if root_url and not self._is_same_domain(l['href'], root_url): continue
            if len(l['text']) > 3: 
                # Assign simple priority
                l['priority'] = 'high' if any(p in l['text'].lower() or p in l['href'].lower() for p in priority_keywords) else 'low'
                relevant_links.append(l)
        
        # Sort specifically to ensure navigation targets are seen by the Brain
        relevant_links.sort(key=lambda x: 1 if x.get('priority') == 'high' else 0, reverse=True)
        
        prompt = f"""
        URL: {current_url}
        Goal: "{goal}"
        Preview: {safe_content}
        Links: {json.dumps(relevant_links[:40])}
        Decide:
        1. EXTRACT: 
           - **MUST EXTRACT** if this page explicitly LISTS Bio, Projects, Education, Experience, or Source Code content (not just links).
           - **MUST EXTRACT** if the URL ends with /about, /projects, /resume, /experience AND content is present.
        2. NAVIGATE: 
           - **MUST NAVIGATE** if you see "Experience", "Work", "Resume", "Projects" links and the CURRENT page does not list the details.
           - Only if the **CURRENT** page is a "Home" or "Menu" page with little content.
        3. SKIP: If irrelevant.
        Return JSON: {{ "action": "extract" | "navigate" | "skip", "target_urls": ["url1", "url2"] }}
        """
        res = self._call_llm(prompt)
        log_step("TRACE", f"BRAIN Decision Result: {json.dumps(res)}")
        return res

    def extract_data(self, content: str, goal: str, url: str) -> dict:
        safe_content = content[:60000]
        
        # Schema Selection based on URL/Content type
        if "github.com" in url and ("/blob/" in url or url.endswith(".py") or url.endswith(".js") or url.endswith(".ts")):
            # --- LLM-as-a-Judge Pipeline ---
            log_step("JUDGE", f"Starting Multi-Judge Review for {url}...")
            static_stats = self._get_static_metrics(content)
            
            reviews = []
            with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
                futures = [executor.submit(self._call_judge, safe_content) for _ in range(3)]
                for future in concurrent.futures.as_completed(futures):
                    try:
                        res = future.result()
                        if res: reviews.append(res)
                    except Exception as e:
                        log_step("WARN", f"Judge failed: {e}")
            
            aggregated = self._aggregate_reviews(reviews)
            aggregated.update(static_stats)
            aggregated["file_name"] = url.split("/")[-1]
            
            return {
                "extracted_data": {
                    "code_reviews": [aggregated]
                }
            }

        elif "github.com" in url:
            # GITHUB REPO ROOT -> Extract as a Project
            schema_guide = """
            CONTEXT: GitHub Repository Root.
            REQUIRED JSON STRUCTURE:
            {
                "projects": [
                    { 
                        "title": "Repo Name (from URL/Header)", 
                        "description": "Summary from README.",
                        "tech_stack": ["Inferred from file list/README"],
                        "live_link": "URL found in description or null",
                        "repo_link": "Current URL"
                    }
                ]
            }
            """
        elif "linkedin.com" in url:
            schema_guide = """
            CONTEXT: LinkedIn.
            JSON: { "extracted_data": { "bio": "Headline", "experience": [...], "education": [...] } }
            """
        else:
            # PORTFOLIO MODE - SCHEMA V2
            schema_guide = """
            CONTEXT: Personal Portfolio.
            REQUIRED JSON STRUCTURE:
            {
                "projects": [
                    { 
                        "title": "Project Title", 
                        "description": "Concise description.",
                        "tech_stack": ["React", "Python"],
                        "live_link": "URL or null",
                        "repo_link": "GitHub/GitLab URL or null"
                    }
                ],
                "experience": [
                    { 
                        "title": "Role Title", 
                        "duration": "Date Range", 
                        "description": "Concise summary." 
                    }
                ]
            }
            """

        prompt = f"""
        Act as a Professional Resume Auditor.
        Goal: {goal}
        URL: {url}
        
        --- CONTENT ---
        {safe_content}
        
        --- INSTRUCTIONS ---
        1. **EXTRACT AGGRESSIVELY, BUT DO NOT HALLUCINATE.** 
           - Do not omit items because fields are missing.
           - **CRITICAL:** If no specific roles/projects are listed, return [] (empty list). 
           - **DO NOT** extract "meta" items like "Experience section found" or "Available in navigation".
        2. {schema_guide}
        3. **PROJECTS RULE:** 
           - 'title': Use Repo Name or Project Title.
           - 'live_link': ONLY include if explicitly stated as "Deployed at" or "Live Demo". Do NOT infer live link from documentation.
           - 'tech_stack': Infer from text.
           - 'repo_link': Look for GitHub/GitLab links.
           - **SCOPE:** Targeted "Projects", "Portfolio" sections are preferred.
           - **FALLBACK:** If no dedicated section exists, look for standalone feature cards with "View Project", "Source Code", or "Demo" links on the main page.
           - **CAPTURE ALL:** If a layout has multiple project cards, capture ALL of them, even if they lack links.
           - **IGNORE:** Project mentions inside "Experience", "About", or "Blog" sections (unless they are distinct side projects).
        4. **EXPERIENCE RULE:**
           - **TARGET SECTIONS:** 'Experience', 'Work', 'Employment', 'History'.
           - **EXTRACT:** Roles, Companies, Dates, and Descriptions.
           - **NOTE:** DO NOT HALLCINATE.
           - ONLY extract if actual Roles/Companies are visible.
        5. **NEGATIVE CONSTRAINTS (CRITICAL):**
           - **NO HALLUCINATIONS:** If a section (Projects/Experience) exists but is empty, or says "Coming Soon", return `[]` (empty list).
           - **NO META-ENTRIES:** Do NOT create entries with titles like "Experience Section", "No Experience Listed", or "Portfolio Page".
           - **NO PLACEHOLDERS:** If a field is missing, use `null`. Do not invent data.
        6. **IGNORE:** Education, Certifications, Bio.
        
        Return JSON object.
        """
        result = self._call_llm(prompt)
        
        # POST-PROCESSING: Clean and Deduplicate
        if "extracted_data" in result:
            result["extracted_data"] = self._clean_extracted_data(result["extracted_data"])
        elif "projects" in result or "experience" in result:
             # Handle flat structure
             result = self._clean_extracted_data(result)
             
        return result

    def _clean_extracted_data(self, data: dict) -> dict:
        """Removes hallucinations, duplicates, and bio-masquerading-as-experience."""
        if not data: return {}
        
        # 1. Clean Experience
        if "experience" in data:
            cleaned_exp = []
            seen_hashes = set()
            
            for item in data["experience"]:
                # Rule A: Skip if it looks like a generic Bio
                desc = (item.get("description") or "").lower()
                title = (item.get("title") or "").lower()
                
                # Keywords that strongly suggest this is a Bio/About Me section, not a Job
                bio_keywords = ["i am a", "specializes in", "focused on", "based in", "passionate about", "currently studying", "hello, i'm"]
                if any(x in desc for x in bio_keywords) and not item.get("duration"):
                    continue
                
                # Rule A.2: Strict Integrity Check - If no duration AND no company (implied by title), it's likely noise
                # But sometimes title has company "Eng @ Google".
                if not item.get("duration") and len(title) < 20 and " at " not in title and "@" not in title:
                     # Risky, but helps remove "Software Engineer" (generic title only)
                     log_step("TRACE", f"Dropped suspicious experience item (No duration/company): {title}")
                     continue

                # Rule B: Skip "No Experience" placeholders
                if "no experience" in title or "coming soon" in title or "experience section" in title:
                    continue

                # Rule C: Deduplicate based on Title + First 20 chars of desc
                # (Simple normalization)
                content_hash = f"{title[:10]}_{desc[:20]}"
                if content_hash in seen_hashes:
                    continue
                seen_hashes.add(content_hash)
                
                cleaned_exp.append(item)
            
            data["experience"] = cleaned_exp

        # 2. Clean Projects (Deduplicate)
        if "projects" in data:
            cleaned_proj = []
            seen_proj = set()
            for p in data["projects"]:
                title = (p.get("title") or "").lower().replace(" ", "")
                if title in seen_proj: continue
                seen_proj.add(title)
                cleaned_proj.append(p)
            data["projects"] = cleaned_proj
            
        return data