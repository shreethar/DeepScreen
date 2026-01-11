import json
import os
import time
from pathlib import Path
from typing import Dict, List, Any
from jsonschema import validate
from openai import OpenAI, RateLimitError
from dotenv import load_dotenv
from faster_whisper import WhisperModel

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

# Initialize OpenRouter Client
client = OpenAI(
    base_url=os.getenv("OPENAI_BASE_URL", "https://openrouter.ai/api/v1"),
    api_key=os.getenv("OPENROUTER_API_KEY")
)

# Global model instance
model = None

def configure_whisper():
    """
    Loads the Whisper model into memory (CPU optimized).
    """
    global model
    if model is None:
        print("Loading local Whisper model (CPU optimized)...")
        try:
            # device="cpu" forces it to run on your processor
            # compute_type="int8" makes it run faster on standard laptops
            model = WhisperModel("large-v2", device="cpu", compute_type="int8")
            print("✅ Whisper model loaded successfully (CPU)")
        except Exception as e:
            print(f"❌ Error loading Whisper: {e}")
            raise e

def transcribe_audio(audio_path: str):
    """
    Transcribes audio locally using Whisper on CPU.
    Returns a verbatim transcript including filler words if detected.
    """
    global model
    if model is None:
        configure_whisper()
    
    print(f"🎤 Transcribing {audio_path} locally (CPU)...")
    start_time = time.time()
    
    try:
        segments, info = model.transcribe(
            audio_path,
            beam_size=5,
            word_timestamps=True,
            vad_filter=True,
            vad_parameters=dict(min_silence_duration_ms=500),
            initial_prompt="Umm, uh, let me think. Like, it's basically... okay, so...",
            condition_on_previous_text=False,
            language="en"
        )
        
        print(f"Detected language: {info.language} with probability {info.language_probability:.2f}")

        full_transcript = []
        word_timestamps = []

        for segment in segments:
            if segment.words:
                for word in segment.words:
                    full_transcript.append(word.word)
                    word_timestamps.append({
                        "word": word.word,
                        "start": word.start,
                        "end": word.end
                    })
            else:
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
