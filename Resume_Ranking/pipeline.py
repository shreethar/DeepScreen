
import json
import copy
from utils import calculate_rule_based_score, calculate_semantic_score, compute_hybrid_fit_score
from llm_ranking import compare_candidates_pairwise, generate_explanation

def run_pipeline(candidates: list, job_data: dict, top_k: int = 5) -> dict:
    """
    Full Hybrid Ranking Pipeline:
    1. Hard Filter (Rule Based)
    2. Soft Score (Semantic) -> Top K
    3. LLM Pairwise Rerank -> Final List
    4. XAI Generation
    """
    
    # ----------------------------------------------------
    # PHASE 1 & 2: SCORING & FILTERING
    # ----------------------------------------------------
    qualified_candidates = []
    rejected_candidates = []
    
    print(f"Processing {len(candidates)} candidates...")
    
    for cand in candidates:
        cand_id = cand.get('id', 'unknown') # ID is the name of the candidate
        
        # 1. Hard Rules
        rule_res = calculate_rule_based_score(cand, job_data)
        
        # Enrich candidate object with score data
        cand['rule_results'] = rule_res
        
        # Helpers for explanation
        cand['experience_years'] = rule_res['scores'].get('total_experience_years')
        # Simple extraction for edu summary (could be better)
        cand['education_summary'] = str(cand.get('sections', {}).get('education', 'Unknown')) 
        
        if not rule_res['qualified']:
            cand['status'] = 'REJECTED'
            cand['scores'] = rule_res['scores'] # Only rule scores matter here
            rejected_candidates.append(cand)
            continue
            
        # 2. Semantic & Hybrid Scoring
        # The utils.py hybrid function calls extract_semantic_features internally
        # We'll use compute_hybrid_fit_score mainly
        hybrid_res = compute_hybrid_fit_score(cand, job_data)
        
        cand['scores'] = hybrid_res # Contains final_score, rule_score, semantic_score, breakdown
        cand['final_numeric_score'] = hybrid_res['final_score']
        cand['status'] = 'QUALIFIED'
        
        qualified_candidates.append(cand)
        
    print(f"Qualified: {len(qualified_candidates)} | Rejected: {len(rejected_candidates)}")
    
    # Sort by Initial Hybrid Score Descending
    qualified_candidates.sort(key=lambda x: x['final_numeric_score'], reverse=True)
    
    # ----------------------------------------------------
    # PHASE 2.5: TOP K SELECTION
    # ----------------------------------------------------
    # We take Top K from the soft score to send to LLM
    # If fewer than K, take all.
    shortlist = qualified_candidates[:top_k]
    others = qualified_candidates[top_k:] # Kept but not reranked
    
    # ----------------------------------------------------
    # PHASE 3: LLM PAIRWISE RERANKING (BUBBLE SORT / TOURNAMENT)
    # ----------------------------------------------------
    # For small K (e.g. 5), a simple bubble sort or insertion sort using LLM comparator is feasible.
    # Let's do a simple Bubble Sort for the Shortlist to refine order.
    # Note: Bubble sort is O(K^2), so K should be small (<= 5 or 10).
    
    if len(shortlist) > 1:
        print(f"Running LLM Pairwise Reranking on Top {len(shortlist)}...")
        job_summary = job_data.get('description', 'Job Role')[:500]
        
        n = len(shortlist)
        for i in range(n):
            for j in range(0, n-i-1):
                cand_a = shortlist[j]
                cand_b = shortlist[j+1]
                
                # Compare A and B
                print(f"Comparing {cand_a.get('id')} vs {cand_b.get('id')}...")
                result = compare_candidates_pairwise(cand_a, cand_b, job_summary)
                
                winner_id = result.get('winner_id')
                
                # If B wins, swap. (We want descending order, so array[0] is best)
                # Currently array is [Best ... Worst]
                # If B is better than A, then B should be at j, A at j+1? 
                # Wait, if we want [Best, 2nd Best...], we usually sort descending.
                # Bubble sort (ascending): pushes largest to end.
                # Here we want Best at index 0.
                # Let's think:
                # If pairwise says "Winner is B", then B > A.
                # If we are at index j (A) and j+1 (B).
                # If B > A, we should swap them so B comes earlier?
                # Yes, for descending order, if B > A, swap.
                
                if winner_id == cand_b.get('id'):
                    shortlist[j], shortlist[j+1] = shortlist[j+1], shortlist[j]
    
    # Combine back
    final_ranked_list = shortlist + others
    
    # ----------------------------------------------------
    # PHASE 4: EXPLAINABLE AI
    # ----------------------------------------------------
    print("Generating Explanations...")
    job_title = job_data.get('title', 'Role')
    
    # Generate for Shortlist (Detailed)
    for i, cand in enumerate(shortlist):
        rank_str = f"RANKED #{i+1}"
        explanation = generate_explanation(cand, job_title, rank_str)
        cand['llm_explanation'] = explanation
        
    # Generate for Rejected (Why failed?)
    for cand in rejected_candidates:
        explanation = generate_explanation(cand, job_title, "REJECTED")
        cand['llm_explanation'] = explanation
        
    # Others might get a generic "Qualified but low score" explanation or skip to save tokens
    for cand in others:
         cand['llm_explanation'] = "Qualified based on criteria but scored lower than top candidates."

    return {
        "ranked": final_ranked_list,
        "rejected": rejected_candidates
    }

# Demo Run
if __name__ == "__main__":
    # Load sample data
    with open('sample_jd.json', 'r') as f:
        jd = json.load(f)
    
    # Create a list of dummy candidates based on sample_resume
    with open('sample_resume.json', 'r') as f:
        base_resume = json.load(f)
        
    # Clone and modify to create variety
    c1 = copy.deepcopy(base_resume)
    c1['id'] = "Alice_Perfect"
    # c1 is already good
    
    c2 = copy.deepcopy(base_resume)
    c2['id'] = "Bob_Junior"
    c2['sections']['experience'] = [{"duration": "0.5", "title": "Intern", "focus": "Learning"}]
    # Bob should fail experience check (1 year min)
    
    c3 = copy.deepcopy(base_resume)
    c3['id'] = "Charlie_Great"
    c3['sections']['education'][0]['degree'] = "Masters"
    c3['sections']['education'][0]['course'] = "Machine Learning"
    # Charlie has slight diff
    
    candidates = [c1, c2, c3]
    
    results = run_pipeline(candidates, jd, top_k=2)
    
    print("\n\n============= FINAL RESULTS =============")
    print("--- RANKED ---")
    for r in results['ranked']:
        print(f"{r['id']} | Score: {r.get('final_numeric_score', 0):.1f}")
        print(f"Explanation: {r.get('llm_explanation')}\n")
        
    print("--- REJECTED ---")
    for r in results['rejected']:
        print(f"{r['id']} | Reason: Rule Failure")
        print(f"Explanation: {r.get('llm_explanation')}\n")
