
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

# Load model once
model = SentenceTransformer('all-MiniLM-L6-v2')

def parse_degree_rank(degree_str):
    """
    Parses a degree string and returns a numeric rank.
    Ph.D = 4
    Masters = 3
    Bachelors = 2
    Diploma = 1
    """
    if not degree_str:
        return 0
    d = degree_str.lower().strip()
    
    # Strict matching based on user prompt
    if 'ph.d' in d or 'phd' in d or 'doctorate' in d:
        return 4
    if 'master' in d:
        return 3
    if 'bachelor' in d:
        return 2
    if 'diploma' in d:
        return 1
        
    return 0

def calculate_rule_based_score(candidate_data, job_data):
    """
    Calculates hard rule scores. Returns invalid (0) if checks fail.
    """
    scores = {}
    is_qualified = True
    
    # 1. Degree Check (Hard Rule)
    # JD education requirement
    jd_edu = job_data.get('education', {})
    req_degree = jd_edu.get('degree', '') if isinstance(jd_edu, dict) else ''
    req_rank = parse_degree_rank(req_degree)
    
    # Resume education (find max rank)
    cand_edu_list = candidate_data.get('sections', {}).get('education', [])
    cand_max_rank = 0
    for edu in cand_edu_list:
        rank = parse_degree_rank(edu.get('degree', ''))
        if rank > cand_max_rank:
            cand_max_rank = rank
            
    # Degree Logic:
    # If req > cand: 0 (Disqualify)
    # If cand >= req: Pass. 
    # If cand > req: higher weight (bonus)
    
    if req_rank > 0: # Only if there is a requirement
        if cand_max_rank < req_rank:
            scores['degree_check'] = 0.0
            is_qualified = False
        else:
            # Base score 1.0. Add bonus for exceeding.
            # e.g. Req Bachelor(2), Has Master(3) -> 1.0 + 0.2 = 1.2
            scores['degree_check'] = 1.0 + (0.2 * (cand_max_rank - req_rank))
    else:
        scores['degree_check'] = 1.0
        
    # 2. Experience Check (Hard Rule)
    min_exp = job_data.get('min_experience_years', 0)
    
    # Calculate total duration from all experiences
    experiences = candidate_data.get('sections', {}).get('experience', [])
    total_yoe = 0.0
    for exp in experiences:
        # Assuming duration is a string number like "2" or "2.5"
        try:
            dur = float(exp.get('duration', 0))
            total_yoe += dur
        except (ValueError, TypeError):
            pass
            
    scores['total_experience_years'] = total_yoe
    
    if total_yoe < min_exp:
        scores['experience_check'] = 0.0
        is_qualified = False
    else:
        scores['experience_check'] = 1.0 # Meets requirement
        
    return {
        'qualified': is_qualified,
        'scores': scores
    }

def get_best_match_score(query_list, target_list):
    """
    For each item in query_list, find best match in target_list.
    Return average of these best matches (coverage).
    If query_list is empty, return 1.0 (nothing required).
    If target_list is empty but query is not, return 0.0.
    """
    if not query_list:
        return 1.0
    if not target_list:
        return 0.0
        
    query_embs = model.encode(query_list)
    target_embs = model.encode(target_list)
    
    # shape: (n_query, n_target)
    sim_matrix = cosine_similarity(query_embs, target_embs)
    
    # For each query item, get max similarity from targets
    max_sims = sim_matrix.max(axis=1)
    
    return float(max_sims.mean())

def calculate_semantic_score(candidate_data, job_data):
    """
    Computes semantic similarity for Education, Certs, Skills, Description.
    """
    scores = {}
    
    sections = candidate_data.get('sections', {})
    
    # 1. Education (Course)
    jd_course = job_data.get('education', {}).get('course', '')
    cand_courses = [e.get('course', '') for e in sections.get('education', []) if e.get('course')]
    
    if jd_course and cand_courses:
        # Normalize jd_course to list
        if isinstance(jd_course, str):
            jd_courses_list = [jd_course]
        elif isinstance(jd_course, list):
            jd_courses_list = jd_course
        else:
            jd_courses_list = []

        if jd_courses_list:
            # Compare all JD courses vs all candidate courses
            jd_embs = model.encode(jd_courses_list)
            cand_embs = model.encode(cand_courses)
            
            # Matrix shape: (n_jd_options, n_cand_courses)
            cos_sim_matrix = cosine_similarity(jd_embs, cand_embs)
            
            # We want the single best match found (max of maxes)
            scores['education_course_similarity'] = float(cos_sim_matrix.max())
        else:
            scores['education_course_similarity'] = 0.0
    else:
        scores['education_course_similarity'] = 0.0 if jd_course else 1.0

    # 2. Certification
    jd_certs = job_data.get('certifications', [])
    cand_certs = sections.get('certifications', [])
    
    # Calculate coverage of JD certs in Candidate certs
    if isinstance(jd_certs, list) and isinstance(cand_certs, list):
        scores['certification_similarity'] = get_best_match_score(jd_certs, cand_certs)
    else:
        scores['certification_similarity'] = 0.0

    # 3. Required Skill
    jd_skills = job_data.get('skills', [])
    cand_skills = sections.get('skills', [])
    
    if isinstance(jd_skills, list) and isinstance(cand_skills, list):
        scores['skill_similarity'] = get_best_match_score(jd_skills, cand_skills)
    else:
        scores['skill_similarity'] = 0.0

    # 4. Description vs Focus
    # JD Description
    jd_desc = job_data.get('description', '')
    
    # Candidate "Focus" from Experience and Projects
    cand_focuses = []
    
    # From Experience
    for exp in sections.get('experience', []):
        if 'focus' in exp:
            cand_focuses.append(exp['focus'])
            
    # From Projects
    for proj in sections.get('projects', []):
        if 'focus' in proj:
            cand_focuses.append(proj['focus'])
            
    if jd_desc and cand_focuses:
        jd_desc_emb = model.encode([jd_desc])
        focus_embs = model.encode(cand_focuses)
        
        # Calculate similarity for each focus
        sims = cosine_similarity(jd_desc_emb, focus_embs)[0]
        
        # Pick the highest one
        scores['description_focus_similarity'] = float(sims.max())
    else:
        scores['description_focus_similarity'] = 0.0

    return scores

def compute_hybrid_fit_score(candidate_data, job_data, weights=None):
    """
    Combines rule-based and semantic scores into a final weighted score.
    """
    if weights is None:
        weights = {
            # Rule based (bonuses)
            'degree_score': 0.15, 
            'experience_score': 0.15,
            
            # Semantic
            'education_course': 0.10,
            'certifications': 0.15,
            'skills': 0.25,
            'description_focus': 0.20
        }
        
    # 1. Get Rule Scores
    rule_res = calculate_rule_based_score(candidate_data, job_data)
    rule_scores_raw = rule_res['scores']
    
    # 2. Get Semantic Scores
    semantic_scores = calculate_semantic_score(candidate_data, job_data)
    
    # 3. Combine
    # Note: rule_scores_raw['degree_check'] might be > 1.0 (bonus)
    # semantic scores are 0.0 to 1.0
    
    final = (
        rule_scores_raw.get('degree_check', 0) * weights['degree_score'] +
        rule_scores_raw.get('experience_check', 0) * weights['experience_score'] +
        semantic_scores.get('education_course_similarity', 0) * weights['education_course'] +
        semantic_scores.get('certification_similarity', 0) * weights['certifications'] +
        semantic_scores.get('skill_similarity', 0) * weights['skills'] +
        semantic_scores.get('description_focus_similarity', 0) * weights['description_focus']
    )
    
    # Normalize to 0-100? Or just return raw probability-like?
    # User likes 0-100 usually.
    final_score_100 = final * 100
    
    return {
        'final_score': final_score_100,
        'rule_score': rule_scores_raw,
        'semantic_score': semantic_scores,
        'breakdown': {
            'rules': rule_scores_raw,
            'semantic': semantic_scores
        }
    }

