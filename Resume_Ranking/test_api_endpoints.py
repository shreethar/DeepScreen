
from fastapi.testclient import TestClient
from main import app
import os

client = TestClient(app)

JD_TEXT = """
Machine Learning Engineer. 
Required: Python, PyTorch, 3 years experience. 
Nice to have: NLP, AWS.
"""

def test_endpoints():
    print("\n🔍 Testing New API Endpoints...")
    
    # Check if we have sample PDFs
    files = [f for f in os.listdir(".") if f.endswith(".pdf")]
    if not files:
        print("⚠️ No PDF files found in root. Please ensure 'ATS Resume.pdf' etc are present.")
        return

    # Use first 2 files for testing
    test_files = [('files', (f, open(f, 'rb'), 'application/pdf')) for f in files[:2]]
    
    # 1. Test Batch Scoring
    print("\n1️⃣  Testing /score-candidates/ (Batch)...")
    res1 = client.post("/score-candidates/", data={"job_description": JD_TEXT}, files=test_files)
    if res1.status_code == 200:
        data1 = res1.json()
        print(f"   ✅ Success! Got {len(data1)} results.")
        print(f"   Top Score: {data1[0]['rank_score']}")
    else:
        print(f"   ❌ Failed: {res1.text}")
        return

    # Reset file pointers for next request
    test_files = [('files', (f, open(f, 'rb'), 'application/pdf')) for f in files[:2]]

    # 2. Test SPPR Reranking
    print("\n2️⃣  Testing /rerank-candidates/ (SPPR)...")
    res2 = client.post("/rerank-candidates/", data={"job_description": JD_TEXT}, files=test_files)
    if res2.status_code == 200:
        data2 = res2.json()
        print(f"   ✅ Success! Got {len(data2)} results.")
        # Check for match history
        if "match_history" in data2[0]:
            print(f"   ✅ Match History found: {data2[0]['match_history']}")
        else:
            print("   ⚠️ No match_history found (maybe only 1 qualified candidate?)")
    else:
        print(f"   ❌ Failed: {res2.text}")
        return

    # 3. Test Explanation
    print("\n3️⃣  Testing /explain-candidate/...")
    if data1:
        candidate = data1[0] # Take first result from batch
        res3 = client.post("/explain-candidate/", json={
            "job_description": JD_TEXT,
            "candidate_data": candidate
        })
        if res3.status_code == 200:
            exp = res3.json()
            print(f"   ✅ Explanation received for {exp['filename']}")
            print(f"   Excerpt: {exp['ai_explanation'][:50]}...")
        else:
            print(f"   ❌ Failed: {res3.text}")

if __name__ == "__main__":
    test_endpoints()
