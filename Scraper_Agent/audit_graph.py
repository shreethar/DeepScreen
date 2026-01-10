import asyncio
import json
import re
from typing import TypedDict, List, Dict, Any, Annotated
from langgraph.graph import StateGraph, END
from crawler_engine import CrawlerEngine
from auditor_brain import AuditorBrain
from utils import log_step

# --- SMART MERGER HELPERS ---
def normalize_key(s):
    """Aggressive normalization for deduplication keys."""
    if not s: return ""
    # Remove non-alphanumeric, lower case
    return re.sub(r'[^a-z0-9]', '', str(s).lower())

def is_useful_link(url: str) -> bool:
    """Filters out noise links, especially for GitHub."""
    if not url: return False
    lower_url = url.lower()
    
    # GitHub Noise Blocklist: Stop agent from wandering into commit history or metadata
    if "github.com" in lower_url:
        # ALLOW code navigation links
        if "/blob/" in lower_url or "/tree/" in lower_url:
            return True
            
        noise_patterns = [
            "/commit/", "/commits/", "/blame/", "/compare/", 
            "/issues", "/pulls", "/actions", "/projects", 
            "/security", "/pulse", "/find/", "/stargazers",
            "/watchers", "/network", "/search", "/forks"
        ]
        if any(np in lower_url for np in noise_patterns):
            return False
            
    return True

def merge_item_list(current_list: List[Dict], new_list: List[Dict], keys_to_match: List[str]) -> List[Dict]:
    """
    Merges two lists of dicts. If items match keys, combine their data.
    """
    if not new_list: return current_list or []
    if not current_list: current_list = []
    
    merged_map = {} 
    
    def get_id(item):
        parts = [normalize_key(item.get(k)) for k in keys_to_match]
        if not any(parts): return None 
        return "|".join(parts)

    # 1. Load existing
    for item in current_list:
        uid = get_id(item)
        if uid: merged_map[uid] = item

    # 2. Merge new
    for item in new_list:
        uid = get_id(item)
        
        # FIX: If no ID found (e.g. missing title), just append. Don't drop.
        if not uid: 
            merged_map[f"__uniq_{len(merged_map)}"] = item
            continue
        
        if uid in merged_map:
            existing = merged_map[uid]
            for field, val in item.items():
                if not val: continue 
                curr_val = existing.get(field)
                if not curr_val:
                    existing[field] = val
                elif isinstance(val, str) and isinstance(curr_val, str):
                    if len(val) > len(curr_val):
                        existing[field] = val
                elif isinstance(val, list) and isinstance(curr_val, list):
                     existing[field] = list(set(curr_val + val))
        else:
            merged_map[uid] = item
            
    return list(merged_map.values())

def merge_profile(old_profile: Dict, new_data: Dict) -> Dict:
    if not old_profile: old_profile = {}
    if not new_data: return old_profile

    # Handle nesting - fallback for old/new structure
    if "sections" in new_data: 
        # Convert legacy sections to V2 flat if accidentally returned
        new_data = new_data["sections"]
    if "extract_data" in new_data:
        new_data = new_data["extract_data"]

    merged = old_profile.copy()
    
    # 1. Portfolio URL (Preserve existing or set from new if somehow missing)
    if "portfolio_url" not in merged and "portfolio_url" in new_data:
        merged["portfolio_url"] = new_data["portfolio_url"]

    # 2. Projects & Experience Merging
    # Schema V2: Flat "projects" and "experience" lists
    # 2. Projects & Experience Merging
    # Schema V2: Flat "projects" and "experience" lists
    # Added "code_reviews" for GitHub Evaluator restoration
    for key in ["projects", "experience", "code_reviews"]:
        match_key = "file_name" if key == "code_reviews" else "title"
        merged[key] = merge_item_list(
            merged.get(key, []),
            new_data.get(key, []) or [],
            keys_to_match=[match_key] 
        )

    return merged

import operator

# --- STATE & NODES ---
class AuditState(TypedDict):
    start_url: str
    goal: str
    url_queue: List[str]
    visited_urls: Annotated[List[str], operator.add]
    current_urls: List[str]
    profile: Annotated[Dict, merge_profile] 
    iteration: int

crawler = CrawlerEngine()
brain = AuditorBrain()

async def init_crawl(state: AuditState):
    if state['iteration'] == 0: await crawler.start(headless=False)
    url = state['start_url']
    await crawler.visit(url)
    await crawler.scroll_to_bottom() # Force lazy load for SPAs
    
    # FIX: Extract data from the start page (e.g. Bio, Projects if on subpage)
    markdown = await crawler.get_page_markdown()
        
    start_data = brain.extract_data(markdown, state['goal'], url)
    if start_data:
        log_step("TRACE", f"Start Page Extraction: {list(start_data.keys())}")
    
    raw_links = await crawler.extract_links(url)
    
    # PRE-FILTER NOISE
    valid_links = [l for l in raw_links if is_useful_link(l['href'])]
    
    log_step("PLAN", f"Found {len(valid_links)} useful links. Filtering...")
    targets = brain.filter_links(state['goal'], valid_links, root_url=url)
    targets = [t for t in targets if t != url]
    log_step("PLAN", f"Selected Missions: {targets}")
    
    # V2 INIT: Set portfolio_url immediately
    initial_profile = {"portfolio_url": url}
    if start_data:
        initial_profile = merge_profile(initial_profile, start_data)

    return {"url_queue": targets, "visited_urls": [url], "profile": initial_profile}

async def visit_next(state: AuditState):
    queue = state['url_queue']
    if not queue: return {"current_urls": []}
    
    # BATCHING: Take up to 2 URLs
    batch_size = 2
    next_batch = []
    remaining_queue = []
    
    # Filter visited while building batch
    visited = set(state['visited_urls'])
    for url in queue:
        if len(next_batch) < batch_size:
            if url not in visited:
                next_batch.append(url)
                visited.add(url) # Mark as visited immediately to prevent dups in batch
        else:
            remaining_queue.append(url)
            
    if not next_batch:
        return {"current_urls": [], "url_queue": []}

    return {
        "current_urls": next_batch, 
        "url_queue": remaining_queue, 
        "visited_urls": next_batch
    }

async def process_single_url(url: str, state: AuditState):
    """Worker function for a single URL."""
    try:
        # 1. FAST PATH (Skip Playwright for code/raw files)
        markdown = await crawler.fast_fetch(url)
        used_fast_path = bool(markdown)
        
        # 2. SLOW PATH (Playwright)
        if not markdown:
            await crawler.visit(url)
            await crawler.scroll_to_bottom() # Scrape full page content
            markdown = await crawler.get_page_markdown()
            
        # 3. BRAIN ANALYSIS
        # Extract links only if using Playwright (Fast fetch doesn't parse links well yet)
        if used_fast_path:
            links = []
        else:
            raw_links = await crawler.extract_links(url)
            links = [l for l in raw_links if is_useful_link(l['href'])]

        decision = brain.analyze_page_relevance(url, markdown, links, state['goal'], root_url=state['start_url'])
        action = decision.get("action", "skip")
        log_step("DECISION", f"{url} -> {action.upper()}")

        result = {"new_links": [], "data": {}}

        if action == "navigate":
            targets = decision.get("target_urls", [])
            if not targets:
                single = decision.get("target_url")
                if single: targets = [single]
            result["new_links"] = targets

        if action == "extract":
            log_step("READ", f"Extracting from {url}...")
            data = brain.extract_data(markdown, state['goal'], url)
            # LOG TRACE
            if data and "sections" in data:
                log_step("TRACE", f"EXTRACTION SUCCESS (Sections): {url} | Keys: {list(data['sections'].keys())}")
            elif data and "extracted_data" in data:
                log_step("TRACE", f"EXTRACTION SUCCESS (Legacy): {url} | Keys: {list(data['extracted_data'].keys())}")
            else:
                log_step("TRACE", f"EXTRACTION EMPTY: {url} | Data: {str(data)}")
            
            result["data"] = data
            
            
            result["data"] = data
        
        result["url"] = url
        return result
    except Exception as e:
        log_step("ERR", f"Failed processing {url}: {e}")
        return {"new_links": [], "data": {}}

async def scrape_page(state: AuditState):
    urls = state['current_urls']
    if not urls: return {}
    
    log_step("PARALLEL", f"Scraping batch: {len(urls)} URLs")
    
    # Run batch in parallel
    results = await asyncio.gather(*[process_single_url(u, state) for u in urls])
    
    # Aggregate
    combined_new_links = []
    combined_data = {}
    
    for res in results:
        # Add links
        for l in res["new_links"]:
            if l and is_useful_link(l) and l not in state['visited_urls']:
                combined_new_links.append(l)
        
        # Merge data (naive merge since global merge handles the rest)
        # We can't easily merge dicts here without the reducer, so we rely on the state reducer
        # However, the state reducer takes ONE dict. We need to combine 'data' from multiple results.
        # Let's verify 'merge_profile' can handle recursive updates.
        # Actually, best to return one combined dict if possible, or just pick the 'extracted' parts.
        # Since 'merge_profile' handles "extracted_data" key, we can construct a list wrapper?
        # No, merge_profile expects `new_data` dict.
        # Let's sequentially merge into a local dict using the same logic?
        # Or just pass the logic to the reducer? 
        # The node returns A PARTIAL UPDATE.
        # If we return {"profile": d1}, {"profile": d2}... wait, returning from node updates state ONCE.
        # We need to manually merge "data" (which contains "extracted_data") into one big update object.
        
        extracted = res["data"]
        if extracted:
            # We use the existing merge_profile logic manually here? 
            # Or simplified: just list concatenation for arrays.
            # Simplified for batch:
            # Simplified for batch:
                # Match V2 Schema (Flat)
            # If accidentally nested, peel it off
            if "sections" in extracted: extracted = extracted["sections"]
            elif "extracted_data" in extracted: extracted = extracted["extracted_data"]

            target = combined_data # Flat merge
            
            for k, v in extracted.items():
                if isinstance(v, list):
                    # Naive list append (reducer will dedup)
                    target[k] = target.get(k, []) + v
                    log_step("TRACE", f"MERGE {k}: +{len(v)} items from {res.get('url', 'unknown')} (Total: {len(target[k])})")
                elif v and k not in target:
                     target[k] = v # Overwrite primitives (first wins or just set)
            
            # DEBUG: Check if code_reviews is present
            if "code_reviews" in extracted:
                log_step("DEBUG", f"Found code_reviews in worker output! Count: {len(extracted['code_reviews'])}")
            else:
                log_step("DEBUG", f"No code_reviews in worker output for {res.get('url')}. Keys: {list(extracted.keys())}")

    # Prepend new links to queue (Depth-first-ish)
    current_q = state.get('url_queue', [])
    # We shouldn't duplicate what's already in queue
    final_links = [l for l in combined_new_links if l not in current_q]
    
    return {"profile": combined_data, "url_queue": final_links + current_q}

workflow = StateGraph(AuditState)
workflow.add_node("init", init_crawl)
workflow.add_node("dispatcher", visit_next)
workflow.add_node("scraper", scrape_page)
workflow.set_entry_point("init")
workflow.add_edge("init", "dispatcher")
workflow.add_conditional_edges("dispatcher", lambda x: "scrape" if x['current_urls'] else "end", {"scrape": "scraper", "end": END})
workflow.add_edge("scraper", "dispatcher")
audit_app = workflow.compile()