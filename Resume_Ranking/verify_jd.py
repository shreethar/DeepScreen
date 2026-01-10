
from ats_parsers import parse_jd
import json

SAMPLE_JD_TEXT = """
Title: {Machine Learning Engineer Intern}
 
Job Description:
We are seeking a highly motivated Machine Learning Engineer Intern.
Technical Stack: Python, PyTorch, TensorFlow.
Qualifications: Bachelor's degree in CS.
"""

def verify():
    print("Running JD Parse...")
    data = parse_jd(SAMPLE_JD_TEXT)
    print(json.dumps(data, indent=2))

if __name__ == "__main__":
    verify()
