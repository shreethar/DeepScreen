import sys
import asyncio
import numpy as np

# Real imports will happen in scoring.py
from scoring import check_hard_constraints, calculate_hybrid_score

# ==========================================
# 1. Mock Data
# ==========================================

MOCK_JD = {
  "title": "Machine Learning Engineer Intern",
  "skills": [
    "Python",
    "PyTorch",
    "TensorFlow",
    "Keras",
    "Scikit-learn",
    "Hugging Face Transformers",
    "LangChain",
    "LlamaIndex",
    "FAISS",
    "Chroma",
    "Milvus",
    "FastAPI",
    "Flask",
    "MLflow",
    "Weights & Biases",
    "AWS",
    "Azure",
    "Anomaly detection",
    "Computer vision",
    "NLP",
    "RAG pipelines",
    "LLM-based agents"
  ],
  "min_experience_years": 0,
  "education": {
    "degree": "Bachelor\u2019s degree",
    "course": [
      "Computer Science",
      "Artificial Intelligence",
      "Machine Learning",
      "Data Science",
      "Mathematics"
    ]
  },
  "certifications": [],
  "description": "We are seeking a highly motivated Machine Learning Engineer Intern / Graduate AI Engineer to join our AI & Analytics team. This role is ideal for candidates with a strong foundation in machine learning and deep learning, demonstrated through academic research, internships, or high-impact personal projects. You will work closely with senior engineers and researchers to prototype, build, and deploy AI-driven features, with exposure to real-world production systems, MLOps workflows, and scalable ML services. Responsibilities Assist in developing and deploying machine learning and deep learning models for real-world applications Contribute to AI features such as: Intelligent chatbots and AI assistants Anomaly detection and predictive analytics Natural language querying and information retrieval systems Support the transition of AI prototypes and research ideas into production-ready systems Build and optimize Retrieval-Augmented Generation (RAG) pipelines using vector databases and embedding models Experiment with fine-tuning large or small language models for domain-specific tasks Participate in model evaluation, experiment tracking, and performance monitoring Collaborate with cross-functional teams to integrate AI services into backend APIs Document experiments, model behavior, and system design clearly Technical Stack Exposure Programming: Python ML/DL: PyTorch, TensorFlow/Keras, Scikit-learn LLMs: Hugging Face Transformers, fine-tuning frameworks (LoRA/PEFT) AI Systems: LangChain, LlamaIndex, vector databases (FAISS, Chroma, Milvus) Backend: FastAPI / Flask MLOps: MLflow, Weights & Biases, experiment tracking Deployment: GPU inference, basic CI/CD concepts, cloud platforms (AWS/Azure preferred) Qualifications Education Bachelor\u2019s or Master\u2019s degree in: Computer Science Artificial Intelligence Machine Learning Data Science Mathematics or related field Experience No prior full-time industry experience required Strong ML/AI background demonstrated through: Research projects Academic work Internships Open-source contributions High-impact personal or freelance projects Required Skills Strong proficiency in Python Solid understanding of: Machine learning fundamentals Deep learning concepts Neural networks and training pipelines Hands-on experience with at least one deep learning framework (PyTorch or TensorFlow) Familiarity with LLM concepts such as: Prompting Fine-tuning Embeddings and semantic search Basic understanding of deploying ML models via APIs Preferred / Bonus Skills Experience with: Anomaly detection (image, video, or time-series) Computer vision or NLP research projects RAG pipelines or LLM-based agents Familiarity with experiment tracking tools (MLflow, W&B) Exposure to cloud platforms (AWS SageMaker, EC2, Azure ML) Participation in competitions, publications, or open-source AI projects What We\u2019re Looking For Strong problem-solving mindset Ability to learn quickly and work independently Passion for applied AI and real-world impact Comfortable reading research papers and implementing ideas Curious, driven, and technically ambitious"
}
# Candidate 1: Perfect Match (Should PASS)
# Candidate 1: Perfect Match (Should PASS)
CANDIDATE_REAL_DINESH = {
    "filename": "Real Dinesh",
    "summary": "Highly analytical and results-driven AI Engineering student...",
    "portfolio_url": "https://dinesh-portfolio.vercel.app",
    "skills": [
      "Machine Learning", "Deep Learning", "Neural Networks", "LLM Fine-Tuning", "Data Analysis",
      "Computer Vision", "Python", "JavaScript", "React", "Express.js", "Node.js", "MERN Stack",
      "AWS", "Oracle SQL", "FastAPI"
    ],
    "experience": [
      {
        "title": "Chess Personal Coach",
        "duration": 0.17,
        "description": "Designed and delivered personalized training curricula..."
      },
      {
        "title": "Crew Member",
        "duration": 0.17,
        "description": "Drove operational efficiency..."
      }
    ],
    "education": [
      {
        "degree": "Bachelor of Science",
        "course": "Artificial Intelligence",
        "year": "Sep 2023 - Oct 2027"
      }
    ],
    "projects": [
      {
        "title": "Personal Portfolio",
        "description": "Full-stack development",
        "repo_link": "https://personal-portfolio-project-dun.vercel.app",
        "tech_stack": ["React", "Node.js"],
        "live_link": ""
      }
    ],
    "certifications": ["AWS Cloud Practitioner", "Oracle SQL Database"]
}

CANDIDATE_REAL_SHREETHAR = {
    "filename": "Real Shreethar",
    "summary": "Aspiring AI Engineer with a CGPA of 3.83...",
    "portfolio_url": "https://shreethar-portfolio.vercel.app",
    "skills": [
      "AI", "Robotics", "Deep Learning", "LLM", "RL", "Computer Vision", "MLFlow",
      "Weight & Biases", "Gemma", "Qwen", "Unsloth AI", "EfficientAD", "LLaMa",
      "AWS SageMaker", "Sci-Kit Learn", "Streamlit", "Python", "FastAPI"
    ],
    "experience": [
      {
        "title": "MJR Intelligent Solutions",
        "duration": 0.08,
        "description": "Implemented AI sales agent chatbot into WhatsApp..."
      },
      {
        "title": "Freelance AI Engineer (Fiverr)",
        "duration": 0.5,
        "description": "Built AI chatbots for WhatsApp..."
      }
    ],
    "education": [
      {
        "degree": "Bachelor of Computer Science (Artificial Intelligence) with Honours",
        "course": "Specialisation in Artificial Intelligence...",
        "year": "Oct 2023 - Feb 2027"
      }
    ],
    "projects": [
      {
        "title": "Video Anomaly Detection and Localization",
        "description": "Modified PLOVAD and OpenAI’s CLIP...",
        "repo_link": "",
        "tech_stack": ["PyTorch", "CLIP"],
        "live_link": ""
      },
      {
        "title": "Reinforced Fine-Tuning LLMs with GRPO",
        "description": "Fine-tuned Gemma 3 1B & Qwen 2.5 3B...",
        "repo_link": "",
        "tech_stack": ["Unsloth AI", "GRPO"],
        "live_link": ""
      }
    ],
    "certifications": []
}

CANDIDATE_FAKE_SHREETHAR = {
    "filename": "Fake Shreethar",
    "summary": "Machine Learning Engineer with hands-on experience...",
    "portfolio_url": "",
    "skills": [
      "Machine Learning", "AI Systems", "LLM", "RAG pipelines", "Anomaly Detection",
      "PyTorch", "Hugging Face", "FastAPI", "MLOps", "MLflow", "CI/CD", "Scikit-learn",
      "Streamlit", "SLMs", "Deep Learning", "Reinforcement Learning", "Computer Vision",
      "AWS SageMaker", "CLIP"
    ],
    "experience": [
      {
        "title": "MJR Intelligent Solutions",
        "duration": 0.08,
        "description": "Delivered end-to-end AI chatbot solutions..."
      },
      {
        "title": "Freelance AI Engineer (Fiverr)",
        "duration": 0.08,
        "description": ""
      }
    ],
    "education": [
      {
        "degree": "Bachelor of Computer Science (Artificial Intelligence) with Honours",
        "course": "",
        "year": "Oct 2023 - Feb 2027"
      }
    ],
    "projects": [
      {
        "title": "Video Anomaly Detection & Localization",
        "description": "Extended PLOVAD with CLIP-based representations...",
        "repo_link": "",
        "tech_stack": ["CLIP", "MLflow"],
        "live_link": ""
      }
    ],
    "certifications": []
}

# ==========================================
# 2. Test Logic
# ==========================================

from llm_ranking import compare_two_candidates, rank_candidates_with_mergesort

async def test_pipeline():
    print("\nStarting Pipeline Test...\n")
    
    candidates = [CANDIDATE_REAL_DINESH, CANDIDATE_FAKE_SHREETHAR, CANDIDATE_REAL_SHREETHAR]
    qualified_candidates = []
    
    for cand in candidates:
        print(f"Testing {cand['filename']}...")
        
        # A. Check Hard Constraints
        constraint_res = check_hard_constraints(cand, MOCK_JD)
        status = "QUALIFIED" if constraint_res["pass"] else "REJECTED"
        print(f"  -> Status: {status}")
        print(f"  -> Reason: {constraint_res['reason']}")
        
        # B. Check Score (only if qualified)
        if constraint_res["pass"]:
            scores = calculate_hybrid_score(cand, MOCK_JD)
            # Add scores to candidate object for reranking
            cand['rank_score'] = scores['total_score']
            
            # COPY fields to avoid circular reference in JSON serialization
            resume_keys = ["summary", "skills", "experience", "education", "projects", "certifications", "portfolio_url"]
            cand['extracted_data'] = {k: cand.get(k) for k in resume_keys}
            qualified_candidates.append(cand)
            print(f"  -> Score: {scores['total_score']}")
            print(f"  -> Breakdown: {scores['breakdown']}")
            
        print("-" * 30)

    # C. LLM Pairwise Reranking (Tournament)
    print("\nStarting LLM Pairwise Reranking (Tournament)...\n")
    
    # Initial sort by score
    qualified_candidates.sort(key=lambda x: x['rank_score'], reverse=True)
    
    # Mock JD Summary for LLM context
    jd_summary = f"{MOCK_JD['title']} ({MOCK_JD['min_experience_years']}y exp)"
    
    # Merge Sort Reranking
    print("\nRunning Async Merge Sort on Top 5 candidates...")

    # Limit to top 5 (though we only have ~3)
    top_k = qualified_candidates[:5]
    
    # Run Merge Sort
    # Note: reasoning is now hidden inside the recursive calls, 
    # but we can trust the final order. To see reasoning, we'd need to log inside compare function or use a callback.
    # For now, we trust the sort.
    top_k = await rank_candidates_with_mergesort(top_k, jd_summary)
    
    qualified_candidates = top_k + qualified_candidates[5:]
    
    print("\nFinal Ranked List:")
    for idx, c in enumerate(qualified_candidates, 1):
        print(f" {idx}. {c['filename']} (Score: {c['rank_score']})")
        
async def main():
    await test_pipeline()

if __name__ == "__main__":
    asyncio.run(main())
