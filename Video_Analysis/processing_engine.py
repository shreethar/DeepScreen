import video_processor as processor
import llm_output as ai_service
import facial_analysis
from pathlib import Path

def execute_processing_logic(temp_video_path: Path, temp_dir: str):
    """
    Synchronous helper containing CPU-bound processing.
    Implements the "Hybrid" Video Analysis Pipeline:
    1. Visual (OpenCV)
    2. Audio (Librosa/Algorithmic)
    3. Substance (LLM)
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
    word_timestamps = []
    
    # Substance Metrics (Defaults)
    substance_data = {
        "structure_score": 0,
        "relevance_score": 0,
        "conciseness_score": 0,
        "summary": "No audio detected."
    }

    if has_audio:
        # 3. AI Transcription (Whisper CPU)
        print("Running AI transcription (Whisper CPU)...")
        ai_service.configure_whisper()
        transcript, word_timestamps = ai_service.transcribe_audio(str(audio_path))
        
        # 4. Substance Analysis (LLM)
        if transcript:
            substance_data = ai_service.analyze_substance(transcript)
        
        # 5. Algorithmic Audio Metrics
        print("Calculating acoustic metrics...")
        audio_duration = processor.get_audio_duration(str(audio_path))
        filler_count = processor.count_filler_words(transcript)
        
        # Use new AI-timestamp based pause detection
        pause_count = processor.detect_pauses_from_timestamps(word_timestamps, min_pause_duration=0.8)
        
        speaking_rate = processor.calculate_speaking_rate(transcript, audio_duration)
        loudness_db = processor.analyze_loudness(str(audio_path))
    
    # 6. Facial Metrics (MediaPipe)
    print("Calculating detailed facial metrics (MediaPipe)...")
    analyzer = facial_analysis.VideoFacialAnalyzer()
    
    # Analyze normalized video
    facial_results = analyzer.analyze_video(str(normalized_path), skip_frames=2)
    
    # Fallback if no face detected
    if not facial_results:
        facial_results = {
            "liveness_status": "FAIL", "eye_contact_score": 0.0,
            "head_stability_score": 0.0, "blink_rate_bpm": 0.0,
            "smile_percentage": 0.0, "stress_percentage": 0.0
        }

    # =========================================================
    # 7. THE MATRIX SCORING (60% Substance / 20% Delivery / 20% Visual)
    # =========================================================
    
    # --- A. SUBSTANCE SCORE (60%) ---
    # Average of Structure, Relevance, Conciseness (Scaled to 0-100)
    sub_raw_avg = (
        substance_data.get("structure_score", 0) + 
        substance_data.get("relevance_score", 0) + 
        substance_data.get("conciseness_score", 0)
    ) / 3.0
    substance_score = min(100, max(0, sub_raw_avg * 10))

    # --- B. DELIVERY SCORE (20%) ---
    # Base 100 - Penalties for WPM, Fillers, Pauses
    
    # WPM Penalty
    if 120 <= speaking_rate <= 150: wpm_penalty = 0
    elif 110 <= speaking_rate < 120 or 150 < speaking_rate <= 160: wpm_penalty = 5
    elif 90 <= speaking_rate < 110 or 160 < speaking_rate <= 180: wpm_penalty = 10
    else: wpm_penalty = 20
    
    filler_penalty = min(20, filler_count * 2) 
    pause_penalty = min(20, pause_count * 3)   
    
    delivery_score = 100 - (wpm_penalty + filler_penalty + pause_penalty)
    delivery_score = min(100, max(0, delivery_score))

    # --- C. ENGAGEMENT/VISUAL SCORE (20%) ---
    # Average of Eye Contact and Head Stability
    # Penalize for bad Blink Rate or Stress
    
    base_visual = (facial_results['eye_contact_score'] + facial_results['head_stability_score']) / 2.0
    
    blink_rate = facial_results['blink_rate_bpm']
    blink_penalty = 0
    if blink_rate > 35: blink_penalty = 10 # Nervousness
    elif blink_rate < 5: blink_penalty = 5 # Staring
    
    stress_penalty = 0
    if facial_results['stress_percentage'] > 20:
        stress_penalty = 10
        
    visual_score = base_visual - blink_penalty - stress_penalty
    visual_score = min(100, max(0, visual_score))
    
    # --- FINAL WEIGHTED SCORE ---
    final_score = (
        (substance_score * 0.60) +
        (delivery_score * 0.20) +
        (visual_score * 0.20)
    )

    # Auto-fail for spoofing (Liveness Check)
    if facial_results['liveness_status'] == "FAIL":
        final_score = 0
        print("LIVELINESS CHECK FAILED - SCORE 0")

    print(f"Final Matrix Score: {final_score:.1f} (Substance: {substance_score:.1f}, Delivery: {delivery_score:.1f}, Visual: {visual_score:.1f})")
    
    return {
        # Matrix Scores
        "score": final_score,
        "substance_score": substance_score,
        "delivery_score": delivery_score,
        "visual_score": visual_score,
        
        # Raw Metrics
        "transcript": transcript,
        "speaking_rate": speaking_rate,
        "pause_count": pause_count,
        "filler_count": filler_count,
        "loudness_db": loudness_db,
        
        # Facial Raw
        "liveness_status": facial_results['liveness_status'],
        "eye_contact_score": facial_results['eye_contact_score'],
        "blink_rate_bpm": facial_results['blink_rate_bpm'],
        "smile_percentage": facial_results['smile_percentage'],
        "stress_percentage": facial_results['stress_percentage'],
        "head_stability": facial_results['head_stability_score'],
        
        # LLM Insights
        "substance_details": substance_data
    }
