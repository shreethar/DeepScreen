from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import os
import tempfile
import asyncio
from pathlib import Path
import shutil
import processing_engine

app = FastAPI(title="DeepScreen Candidate Video API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "DeepScreen Stateless API is running"}

@app.post("/analyze")
async def analyze_video(file: UploadFile = File(...)):
    """
    Directly analyzes a video file and returns the results.
    No database storage - pure function.
    """
    temp_dir = tempfile.mkdtemp()
    temp_video_path = Path(temp_dir) / f"input_{file.filename}"
    
    try:
        # 1. Save Uploaded File
        print(f"Receiving file: {file.filename}")
        content = await file.read()
        with open(temp_video_path, "wb") as f:
            f.write(content)
            
        # 2. Run Processing Engine (CPU Bound)
        # Run in a separate thread so we don't block the async event loop
        print(f"Starting processing for {file.filename}...")
        results = await asyncio.to_thread(
            processing_engine.execute_processing_logic, 
            temp_video_path, 
            temp_dir
        )
        
        return {
            "status": "success",
            "filename": file.filename,
            "data": results
        }

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
        
    finally:
        # 3. Cleanup
        try:
            shutil.rmtree(temp_dir)
            print(f"Cleaned up temp directory: {temp_dir}")
        except Exception as e:
            print(f"Warning: Could not remove temp dir: {e}")


if __name__=="__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)