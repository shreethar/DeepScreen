import sys
import json
import os
from ats_parsers import parse_jd, parse_resume
from file_loader import ingest_resume

# Sample JD Text for testing
SAMPLE_JD_TEXT = """
Title: {Machine Learning Engineer Intern}
 
Job Description:
We are seeking a highly motivated Machine Learning Engineer Intern / Graduate AI Engineer to join our AI & Analytics team. This role is ideal for candidates with a strong foundation in machine learning and deep learning, demonstrated through academic research, internships, or high-impact personal projects. You will work closely with senior engineers and researchers to prototype, build, and deploy AI-driven features, with exposure to real-world production systems, MLOps workflows, and scalable ML services. Responsibilities Assist in developing and deploying machine learning and deep learning models for real-world applications Contribute to AI features such as: Intelligent chatbots and AI assistants Anomaly detection and predictive analytics Natural language querying and information retrieval systems Support the transition of AI prototypes and research ideas into production-ready systems Build and optimize Retrieval-Augmented Generation (RAG) pipelines using vector databases and embedding models Experiment with fine-tuning large or small language models for domain-specific tasks Participate in model evaluation, experiment tracking, and performance monitoring Collaborate with cross-functional teams to integrate AI services into backend APIs Document experiments, model behavior, and system design clearly Technical Stack Exposure Programming: Python ML/DL: PyTorch, TensorFlow/Keras, Scikit-learn LLMs: Hugging Face Transformers, fine-tuning frameworks (LoRA/PEFT) AI Systems: LangChain, LlamaIndex, vector databases (FAISS, Chroma, Milvus) Backend: FastAPI / Flask MLOps: MLflow, Weights & Biases, experiment tracking Deployment: GPU inference, basic CI/CD concepts, cloud platforms (AWS/Azure preferred) Qualifications Education Bachelor’s or Master’s degree in: Computer Science Artificial Intelligence Machine Learning Data Science Mathematics or related field Experience No prior full-time industry experience required Strong ML/AI background demonstrated through: Research projects Academic work Internships Open-source contributions High-impact personal or freelance projects Required Skills Strong proficiency in Python Solid understanding of: Machine learning fundamentals Deep learning concepts Neural networks and training pipelines Hands-on experience with at least one deep learning framework (PyTorch or TensorFlow) Familiarity with LLM concepts such as: Prompting Fine-tuning Embeddings and semantic search Basic understanding of deploying ML models via APIs Preferred / Bonus Skills Experience with: Anomaly detection (image, video, or time-series) Computer vision or NLP research projects RAG pipelines or LLM-based agents Familiarity with experiment tracking tools (MLflow, W&B) Exposure to cloud platforms (AWS SageMaker, EC2, Azure ML) Participation in competitions, publications, or open-source AI projects What We’re Looking For Strong problem-solving mindset Ability to learn quickly and work independently Passion for applied AI and real-world impact Comfortable reading research papers and implementing ideas Curious, driven, and technically ambitious
"""

def test_jd_parsing():
    print("\n🔍 Testing JD Parsing...")
    print("=" * 40)
    try:
        jd_data = parse_jd(SAMPLE_JD_TEXT)
        print("✅ JD Parsed Successfully!")
        print("-" * 40)
        print(json.dumps(jd_data, indent=2))
        return jd_data
    except Exception as e:
        print(f"❌ JD Parsing Failed: {e}")
        return None

def test_resume_parsing(pdf_path: str):
    print(f"\n📄 Testing Resume Parsing for: {pdf_path}")
    print("=" * 40)
    
    if not os.path.exists(pdf_path):
        print(f"❌ Error: File not found at {pdf_path}")
        return

    # 1. Ingest (Loader Step)
    print("1️⃣  Ingesting PDF...")
    try:
        ingested = ingest_resume(pdf_path)
        print("   -> Ingestion Complete.")
    except Exception as e:
        print(f"❌ Ingestion Failed: {e}")
        return

    # 2. Parse (LLM Step)
    print("2️⃣  Parsing with LLM...")
    # Using a generic context for better results if JD is null
    jd_context = "Software Engineering Role (Python/General)" 
    
    try:
        resume_data = parse_resume(ingested["text"], jd_context, ingested["links"])
        print("✅ Resume Parsed Successfully!")
        print("-" * 40)
        # Save to file
        with open("resume.json", "w", encoding="utf-8") as f:
            json.dump(resume_data, f, indent=2)
        print("💾 Parsed data saved to resume.json")

    except Exception as e:
        print(f"❌ Resume Parsing Failed: {e}")

if __name__ == "__main__":
    
    # 1. Run JD Test by default
    test_jd_parsing()

    # 2. Run Resume Test if file provided
    if len(sys.argv) > 1:
        target_file = sys.argv[1]
    else:
        # Optional: Ask user or use a default hardcoded for quick testing
        target_file = "ATS Resume.pdf"
    
    if target_file:
        test_resume_parsing(target_file)
