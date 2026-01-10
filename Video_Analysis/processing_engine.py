import video_processor as processor
import ai_service
import facial_analysis
from pathlib import Path

def execute_processing_logic(temp_video_path: Path, temp_dir: str):
    """
    Synchronous helper containing CPU-bound processing.
    """
    normalized_path = Path(temp_dir) / "normalized.mp4"
    audio_path = Path(temp_dir) / "audio.wav"
    
    # 1. Normalize Video
    print("Normalizing video...")
    if not processor.normalize_video(str(temp_video_path), str(normalized_path)):
        raise Exception("Video normalization failed")
        
    # 2. Extract Audio
    print("Extracting audio...")
    has_audio = processor.extract_audio(str(normalized_path), str(audio_path))
    
    transcript = ""
    audio_duration = 0.0
    filler_count = 0
    pause_count = 0
    speaking_rate = 0.0
    loudness_db = -70.0
    
    if has_audio:
        # 3. AI Transcription
        print("Running AI transcription...")
        ai_service.configure_genai()
        transcript, word_timestamps = ai_service.transcribe_audio(str(audio_path))
        
        # 4. Algorithmic Audio Metrics
        print("Calculating acoustic metrics...")
        audio_duration = processor.get_audio_duration(str(audio_path))
        filler_count = processor.count_filler_words(transcript)
        
        # Use new AI-timestamp based pause detection (Robust to noise)
        pause_count = processor.detect_pauses_from_timestamps(word_timestamps, min_pause_duration=0.8)
        
        speaking_rate = processor.calculate_speaking_rate(transcript, audio_duration)
        loudness_db = processor.analyze_loudness(str(audio_path))
    
    # 5. Facial Metrics (MediaPipe)
    print("Calculating detailed facial metrics (MediaPipe)...")
    analyzer = facial_analysis.VideoFacialAnalyzer()
    
    # Analyze normalized video (skip frames for speed)
    facial_results = analyzer.analyze_video(str(normalized_path), skip_frames=2)
    
    # Fallback if no face detected
    if not facial_results:
        facial_results = {
            "liveness_status": "FAIL", "eye_contact_score": 0.0,
            "head_stability_score": 0.0, "blink_rate_bpm": 0.0,
            "smile_percentage": 0.0, "stress_percentage": 0.0
        }

    # 6. Integrated Scoring Logic
    score = 100.0
    
    # Audio Penalties
    if 120 <= speaking_rate <= 150: wpm_penalty = 0
    elif 110 <= speaking_rate < 120 or 150 < speaking_rate <= 160: wpm_penalty = 5
    elif 90 <= speaking_rate < 110 or 160 < speaking_rate <= 180: wpm_penalty = 10
    else: wpm_penalty = 20
    
    filler_penalty = min(15, filler_count * 2) 
    pause_penalty = min(15, pause_count * 3)   
    
    # Visual Penalties
    visual_score = facial_results['eye_contact_score']
    
    blink_rate = facial_results['blink_rate_bpm']
    blink_penalty = 0
    if blink_rate > 35: blink_penalty = 10
    elif blink_rate < 5: blink_penalty = 5
    
    stress_penalty = 0
    if facial_results['stress_percentage'] > 20:
        stress_penalty = 10
        
    # Auto-fail for spoofing (Liveness Check)
    if facial_results['liveness_status'] == "FAIL":
        score = 0
        print("LIVELINESS CHECK FAILED - SCORE 0")
    else:
        score -= (wpm_penalty + filler_penalty + pause_penalty)
        if visual_score < 50:
            score -= (50 - visual_score) * 0.5
        score -= blink_penalty
        score -= stress_penalty
        
    score = max(0, min(100, score))
    print(f"Final Score: {score:.1f}")
    
    return {
        "transcript": transcript,
        "speaking_rate": speaking_rate,
        "pause_count": pause_count,
        "filler_count": filler_count,
        "loudness_db": loudness_db,
        "score": score,
        # Strict Alignment: face_detection_rate removed
        "liveness_status": facial_results['liveness_status'],
        "eye_contact_score": facial_results['eye_contact_score'],
        "blink_rate_bpm": facial_results['blink_rate_bpm'],
        "smile_percentage": facial_results['smile_percentage'],
        "stress_percentage": facial_results['stress_percentage'],
        "head_stability": facial_results['head_stability_score']
    }
