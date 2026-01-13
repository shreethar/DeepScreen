import os
import json
from pathlib import Path
from typing import Dict, Any
from dotenv import load_dotenv
from openai import OpenAI

# Load env from parent directory (DeepScreen/.env) assuming this script is in DeepScreen/Video_Analysis
BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

# Initialize OpenRouter Client
client = OpenAI(
    base_url=os.getenv("OPENAI_BASE_URL", "https://openrouter.ai/api/v1"),
    api_key=os.getenv("OPENROUTER_API_KEY")
)

def _load_cuda_libs():
    """
    On Windows, ctranslate2 needs to find cuBLAS and cuDNN DLLs in the PATH.
    We add them programmatically if the nvidia pip packages are installed.
    """
    if os.name == 'nt':
        libs = ["nvidia.cublas", "nvidia.cudnn"]
        for lib in libs:
            try:
                module = __import__(lib, fromlist=["*"])
                # nvidia.cublas is a namespace package, so __file__ is None. 
                # Use __path__ instead.
                lib_path = list(module.__path__)[0]
                
                # The DLLs are in the 'bin' subdirectory
                bin_path = os.path.join(lib_path, 'bin')
                if bin_path not in os.environ["PATH"]:
                    os.environ["PATH"] = bin_path + os.pathsep + os.environ["PATH"]
            except Exception:
                 # Libraries not installed or structure different, will fail later if CUDA is requested
                 pass

_load_cuda_libs()
from faster_whisper import WhisperModel
import time

# Global model instance
model = None

def configure_genai():
    """
    Loads the Whisper model into memory.
    On the very first run, this will download the model weights (~2GB for medium.en).
    """
    global model
    if model is None:
        print("Loading local Whisper model (CPU optimized)...")
        try:
            # Use medium.en for better fidelity (captures filler words more reliably)
            # device="cpu" forces it to run on your processor
            # compute_type="int8" makes it run faster on standard laptops
            print("Attempting to load Whisper model with CUDA...")
            model = WhisperModel("large-v2", device="cuda", compute_type="int8_float16")
            print("✅ Whisper model loaded successfully (CUDA)")
        except Exception as e:
            print(f"⚠️ CUDA load failed: {e}")
            print("Falling back to CPU...")
            try:
                model = WhisperModel("large-v2", device="cpu", compute_type="int8")
                print("✅ Whisper model loaded successfully (CPU)")
            except Exception as cpu_error:
                print(f"❌ Error loading Whisper on CPU: {cpu_error}")
                raise cpu_error

def transcribe_audio(audio_path: str):
    """
    Transcribes audio locally using Whisper.
    Returns a verbatim transcript including filler words if detected.
    """
    global model
    if model is None:
        configure_genai()
    
    print(f"🎤 Transcribing {audio_path} locally...")
    start_time = time.time()
    
    try:
        segments, info = model.transcribe(
            audio_path,
            beam_size=5,
            word_timestamps=True,   # forces Whisper to keep short utterances like "um"
            vad_filter=True,        # skip silent/noisy parts for better timestamps
            vad_parameters=dict(min_silence_duration_ms=500), # Tunable VAD settings
            initial_prompt="Umm, uh, let me think. Like, it's basically... okay, so...",
            condition_on_previous_text=False,
            language="en"
        )
        
        print(f"Detected language: {info.language} with probability {info.language_probability:.2f}")

        # Debug logging: show both segment.text and word-level output
        full_transcript = []
        word_timestamps = []

        for segment in segments:
            # print(f"[{segment.start:.2f}s -> {segment.end:.2f}s] Segment text: {segment.text}")
            if segment.words:
                for word in segment.words:
                    # print(f"   Word: {word.word}")
                    full_transcript.append(word.word)
                    word_timestamps.append({
                        "word": word.word,
                        "start": word.start,
                        "end": word.end
                    })
            else:
                # fallback if words are missing
                full_transcript.append(segment.text)

        result = " ".join(full_transcript).strip()
        
        duration = time.time() - start_time
        print(f"✅ Transcription complete: {len(result)} characters in {duration:.2f} seconds")
        
        return result, word_timestamps
        
    except Exception as e:
        print(f"❌ Error during transcription: {e}")
        raise e

def analyze_substance(transcript: str) -> Dict[str, Any]:
    """
    Analyzes the transcript using LLM for 'Substance' metrics.
    """
    system_prompt = (
        "You are a Technical Interview Coach. Analyze this transcript from a video resume.\n"
        "**Criteria:**\n"
        "1. **Structure (STAR Method):** Did they explain the Situation, Task, Action, and Result? Or did they ramble?\n"
        "2. **Relevance:** Did they actually answer the prompt, or pivot to irrelevant topics?\n"
        "3. **Conciseness:** Did they get to the point quickly?\n\n"
        "**Output:** Give a score (0-10) for each and a 1-sentence summary of their communication style.\n"
        "Return the response in valid JSON format with the following keys:\n"
        "{\n"
        "  \"structure_score\": int,\n"
        "  \"relevance_score\": int,\n"
        "  \"conciseness_score\": int,\n"
        "  \"summary\": \"string\"\n"
        "}"
    )

    try:
        print("🤔 Sending transcript to LLM for substance analysis...")
        # Using a model that supports JSON mode if possible, or just prompting strongly
        response = client.chat.completions.create(
            model="google/gemini-2.0-flash-001", 
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": transcript}
            ]
        )
        
        content = response.choices[0].message.content
        # Clean up code blocks if present
        if "```json" in content:
            content = content.replace("```json", "").replace("```", "")
        elif "```" in content:
            content = content.replace("```", "")
            
        result = json.loads(content)
        print("✅ LLM Analysis complete.")
        return result
        
    except Exception as e:
        print(f"❌ LLM Analysis failed: {e}")
        return {
            "structure_score": 0,
            "relevance_score": 0,
            "conciseness_score": 0,
            "summary": f"Analysis failed: {str(e)}"
        }