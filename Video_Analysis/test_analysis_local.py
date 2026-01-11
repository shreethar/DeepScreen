import sys
import os
import shutil
import tempfile
import json
from pathlib import Path
import traceback

# Add current directory to path so we can import processing_engine
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from processing_engine import execute_processing_logic
except ImportError as e:
    print("Could not import execute_processing_logic from processing_engine.py")
    print(f"Error: {e}")
    sys.exit(1)

def run_test(video_path_str):
    video_path = Path(video_path_str).resolve()
    
    if not video_path.exists():
        print(f"Error: File not found at {video_path}")
        return

    print(f"--- Starting Analysis for: {video_path.name} ---")

    # Create a fresh temp dir for the processing artifacts
    temp_dir = tempfile.mkdtemp()
    print(f"Temporary working directory: {temp_dir}")
    
    try:
        # Run the logic
        results = execute_processing_logic(video_path, temp_dir)
        
        print("\n" + "="*50)
        print("ANALYSIS RESULTS")
        print("="*50)
        print(json.dumps(results, indent=2))
        print("="*50)
        
        # Save to a local json file for easy reading
        output_file = video_path.with_suffix('.json')
        with open(output_file, 'w') as f:
            json.dump(results, f, indent=2)
        print(f"\nResults saved to: {output_file}")
        
    except Exception:
        traceback.print_exc()
    finally:
        # Clean up
        try:
            shutil.rmtree(temp_dir)
            print(f"Cleaned up temp directory: {temp_dir}")
        except Exception as e:
            print(f"Warning: Could not remove temp dir: {e}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python test_analysis_local.py <path_to_video.mp4>")
    else:
        run_test(sys.argv[1])
