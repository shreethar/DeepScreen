import json
from typing import Dict, List
from ats_parsers import client, MODEL

async def compare_two_candidates(cand_a: Dict, cand_b: Dict, jd_context: str) -> Dict:
    """
    Gen 4 Feature: Pairwise head-to-head comparison logic with structured reasoning.
    Returns: {"winner": "A" or "B", "reasoning": "Short explanation"}
    """
    prompt = (
        f"Job Description: {jd_context}\n\n"
        f"Candidate A: {json.dumps(cand_a.get('extracted_data', {}))}\n"
        f"Candidate B: {json.dumps(cand_b.get('extracted_data', {}))}\n\n"
        "Compare these two candidates based on:"
        "1. Skill relevance to the specific JD.\n"
        "2. Depth of experience (years + focus).\n"
        "3. Quality of projects/achievements.\n\n"
        "Who is the better fit? "
        "Return a JSON object with two keys:\n"
        "- 'winner': 'A' or 'B'\n"
        "- 'reasoning': 'A concise 1-sentence explanation of why the winner was chosen over the loser.'\n"
        "JSON ONLY."
    )
    
    try:
        res = client.chat.completions.create(model=MODEL, messages=[{"role": "user", "content": prompt}], response_format={"type": "json_object"}, temperature=0)
        data = json.loads(res.choices[0].message.content)
        # Fallback if keys missing
        if "winner" not in data: data["winner"] = "A"
        if "reasoning" not in data: data["reasoning"] = "No reasoning provided."
        return data
    except Exception as e: 
        print(f"LLM Error: {e}")
        return {"winner": "A", "reasoning": "Error in comparison, defaulted to A."}

async def generate_explanation(candidate: Dict, jd_context: str) -> str:
    """On-demand Explainability: Generates reasoning only when triggered via API."""
    prompt = f"Explain ranking for {candidate['filename']} against JD: {jd_context}. Scores: {candidate['rank_score']}"
    res = client.chat.completions.create(model=MODEL, messages=[{"role": "system", "content": "XAI Analyst."}, {"role": "user", "content": prompt}], temperature=0)
    return res.choices[0].message.content

class LLMPairwiseSorter:
    def __init__(self, jd_context: str):
        self.jd_context = jd_context
        self.comparison_count = 0

    async def is_stronger(self, cand_a, cand_b):
        """
        Determines if cand_a is stronger than cand_b using LLM comparison.
        Returns True if cand_a is the winner.
        """
        self.comparison_count += 1
        
        print(f"Comparison #{self.comparison_count}: {cand_a['filename']} vs {cand_b['filename']}")
        
        res = await compare_two_candidates(cand_a, cand_b, self.jd_context)
        winner = res.get("winner", "A")
        reasoning = res.get("reasoning", "No advice")
        
        print(f"   -> Winner: {winner} ({cand_a['filename'] if winner == 'A' else cand_b['filename']})")
        print(f"   -> Reason: {reasoning}")

        # Record Match History for frontend transparency
        if "match_history" not in cand_a: cand_a["match_history"] = []
        if "match_history" not in cand_b: cand_b["match_history"] = []
        
        cand_a["match_history"].append({
            "opponent": cand_b['filename'],
            "outcome": "WON" if winner == "A" else "LOST",
            "reason": reasoning
        })
        cand_b["match_history"].append({
            "opponent": cand_a['filename'],
            "outcome": "LOST" if winner == "A" else "WON",
            "reason": reasoning
        })

        # Logic: If A wins, return True (A is stronger). 
        # In sorting (descending order), 'stronger' means 'comes first'.
        # If we want descending order [Best, ..., Worst], then:
        # if A > B, A comes before B.
        return winner == "A"

    async def merge(self, left_list, right_list):
        sorted_list = []
        i = 0 # Pointer for left_list
        j = 0 # Pointer for right_list

        # The Pairwise Comparison Loop
        while i < len(left_list) and j < len(right_list):
            # We compare the HEAD of the left list vs the HEAD of the right list
            # Note: We want DESCENDING sort (Strongest first).
            # If left[i] is stronger than right[j], append left[i]
            if await self.is_stronger(left_list[i], right_list[j]):
                sorted_list.append(left_list[i])
                i += 1
            else:
                sorted_list.append(right_list[j])
                j += 1

        # Append whatever is left over (no comparisons needed)
        sorted_list.extend(left_list[i:])
        sorted_list.extend(right_list[j:])
        
        return sorted_list

    async def merge_sort(self, items):
        # Base Case: A list of 1 is already sorted
        if len(items) <= 1:
            return items

        # Divide
        mid = len(items) // 2
        left_half = items[:mid]
        right_half = items[mid:]

        # Recursive Calls (Keep dividing until we hit single items)
        left_sorted = await self.merge_sort(left_half)
        right_sorted = await self.merge_sort(right_half)

        # Conquer (Merge step)
        names_left = [c['filename'] for c in left_sorted]
        names_right = [c['filename'] for c in right_sorted]
        print(f"--- Merging groups: {names_left} and {names_right} ---")
        
        return await self.merge(left_sorted, right_sorted)

async def rank_candidates_with_mergesort(candidates: list, jd_context: str) -> list:
    """Wrapper function to instantiate Sorter and run merge sort."""
    if not candidates:
        return []
    
    print(f"\nStarting LLM Merge Sort on {len(candidates)} candidates...")
    sorter = LLMPairwiseSorter(jd_context)
    sorted_candidates = await sorter.merge_sort(candidates)
    print(f"Total Comparisons Made: {sorter.comparison_count}")
    
    return sorted_candidates