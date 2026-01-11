import os

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
            model = WhisperModel("large-v2", device="cuda", compute_type="int8_float16")
            print("✅ Whisper model loaded successfully")
        except Exception as e:
            print(f"❌ Error loading Whisper: {e}")
            raise e

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