import subprocess
import os
import re
import json

def normalize_video(input_path: str, output_path: str):
    """
    Normalizes video to a standard format (e.g., mp4, 30fps) using subprocess.
    """
    try:
        command = [
            'ffmpeg',
            '-y', # Overwrite output
            '-i', input_path,
            '-vcodec', 'libx264',
            '-acodec', 'aac',
            '-r', '30',
            output_path
        ]
        
        # Run command and capture output
        result = subprocess.run(
            command, 
            stdout=subprocess.PIPE, 
            stderr=subprocess.PIPE,
            text=True
        )
        
        if result.returncode != 0:
            print(f"FFmpeg error: {result.stderr}")
            return False
            
        return True
    except FileNotFoundError:
        print("Error: FFmpeg binary not found. Please install FFmpeg and add it to your PATH.")
        return False
    except Exception as e:
        print(f"Error normalizing video: {e}")
        return False

def extract_audio(video_path: str, audio_path: str):
    """
    Extracts audio from video for transcription using subprocess.
    """
    try:
        command = [
            'ffmpeg',
            '-y',
            '-i', video_path,
            '-acodec', 'pcm_s16le',
            '-ac', '1',
            '-ar', '16000',
            audio_path
        ]
        
        result = subprocess.run(
            command, 
            stdout=subprocess.PIPE, 
            stderr=subprocess.PIPE,
            text=True
        )
        
        if result.returncode != 0:
            print(f"FFmpeg error: {result.stderr}")
            return False
            
        return True
    except FileNotFoundError:
        print("Error: FFmpeg binary not found. Please install FFmpeg.")
        return False
    except Exception as e:
        print(f"Error extracting audio: {e}")
        return False

def analyze_loudness(audio_path: str):
    """
    Analyzes integrated loudness using FFmpeg ebur128 filter via subprocess.
    Returns loudness in LUFS (dB).
    """
    try:
        command = [
            'ffmpeg',
            '-i', audio_path,
            '-filter_complex', 'ebur128=peak=none',
            '-f', 'null',
            '-' 
        ]
        
        result = subprocess.run(
            command, 
            stdout=subprocess.PIPE, 
            stderr=subprocess.PIPE,
            text=True
        )
        
        # FFmpeg writes log output to stderr
        stderr_text = result.stderr
        
        # Parse for "I:" value (Integrated Loudness)
        # Example line: "    I:         -23.5 LUFS"
        match = re.search(r'I:\s+([-\d.]+)\s+LUFS', stderr_text)
        
        if match:
            loudness = float(match.group(1))
            print(f"Integrated loudness: {loudness} LUFS")
            return loudness
        else:
            print("Could not find integrated loudness in FFmpeg output")
            return -20.0  # Fallback
            
    except FileNotFoundError:
        print("Error: FFmpeg binary not found.")
        return None
    except Exception as e:
        print(f"Error analyzing loudness: {e}")
        return None

def get_audio_duration(audio_path: str) -> float:
    """
    Get audio duration in seconds using librosa.
    """
    try:

        import wave
        import contextlib
        
        # Verify file exists and is not empty
        if not os.path.exists(audio_path) or os.path.getsize(audio_path) == 0:
            print("Audio file is missing or empty.")
            return 0.0
            
        with contextlib.closing(wave.open(audio_path, 'r')) as f:
            frames = f.getnframes()
            rate = f.getframerate()
            duration = frames / float(rate)
            
        print(f"Audio duration: {duration:.2f} seconds")
        return duration
    except Exception as e:
        print(f"Error getting audio duration: {e}")
        return 0.0

def detect_pauses_from_timestamps(word_timestamps: list, min_pause_duration: float = 1.0) -> int:
    """
    Calculates pauses by measuring the time gap between words in the transcript.
    This is noise-resistant because it relies on AI text detection, not audio volume.
    
    Args:
        word_timestamps: List of dicts {'word', 'start', 'end'}
        min_pause_duration: Minimum seconds to count as a pause (default 1.0s)
    """
    if not word_timestamps or len(word_timestamps) < 2:
        return 0
        
    pause_count = 0
    
    # Iterate from the first word to the second-to-last word
    for i in range(len(word_timestamps) - 1):
        current_word_end = word_timestamps[i]['end']
        next_word_start = word_timestamps[i+1]['start']
        
        gap = next_word_start - current_word_end
        # Debug: Print every gap to see what's happening
        # if gap > 0.1:
        #      print(f"Gap: {gap:.3f}s | '{word_timestamps[i]['word']}' -> '{word_timestamps[i+1]['word']}'")
        
        if gap >= min_pause_duration:
            pause_count += 1
            
    print(f"Detected {pause_count} pauses (timestamp-based)")
    return pause_count

def count_filler_words(transcript: str) -> int:
    """
    Count filler words from transcript text.
    """
    
    # Common filler words and phrases
    filler_words = [
        'um', 'uh', 'uhm', 'umm',
        'like', 'you know', 'i mean',
        'sort of', 'kind of',
        'actually', 'basically',
        'literally', 'seriously',
        'right', 'okay', 'so',
        'well', 'yeah', 'ah', 'er'
    ]
    
    transcript_lower = transcript.lower()
    count = 0
    
    for filler in filler_words:
        # Use word boundaries to avoid false matches
        pattern = r'\b' + re.escape(filler) + r'\b'
        matches = re.findall(pattern, transcript_lower)
        count += len(matches)
    
    print(f"Detected {count} filler words")
    return count

def calculate_speaking_rate(transcript: str, audio_duration: float) -> float:
    """
    Calculate speaking rate in words per minute.
    """
    # Count words (simple split)
    word_count = len(transcript.split())
    
    # Convert to words per minute
    duration_minutes = audio_duration / 60.0
    
    if duration_minutes > 0:
        wpm = word_count / duration_minutes
        print(f"Speaking rate: {wpm:.2f} WPM ({word_count} words in {duration_minutes:.2f} minutes)")
        return round(wpm, 2)
    
    return 0.0
