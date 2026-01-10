import sys
import os
import json
from file_loader import ingest_resume

def test_resume_ingestion(pdf_path: str):
    """
    Runs the ingest_resume function on a specific file and prints the output.
    """
    if not os.path.exists(pdf_path):
        print(f"❌ Error: File not found at {pdf_path}")
        return

    print(f"📄 Processing: {pdf_path}...")
    
    try:
        result = ingest_resume(pdf_path)
        
        # Pretty print the result
        print("\n✅ Extraction Successful!")
        print("=" * 40)
        print(f"Used OCR: {result.get('used_ocr')}")
        print(f"Links Found: {result.get('links')}")
        print("-" * 40)
        print("Extracted Text Preview (First 500 chars):")
        print(result.get("text", "")[:500000])
        print("..." if len(result.get("text", "")) > 500 else "")
        print("=" * 40)
        
        # Optional: Dump full JSON to evaluate structure
        # print(json.dumps(result, indent=2))
        
    except Exception as e:
        print(f"❌ Extraction Failed: {e}")

if __name__ == "__main__":
    # Check if path is provided as argument
    if len(sys.argv) > 1:
        target_file = sys.argv[1]
    else:
        # Default or prompt
        target_file = "Dinesh Resume.pdf"
    
    test_resume_ingestion(target_file)
