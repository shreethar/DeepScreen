import cv2
import mediapipe as mp
import numpy as np
import os
import requests
import warnings
from mediapipe.tasks import python
from mediapipe.tasks.python import vision

# Suppress warnings
warnings.filterwarnings('ignore')

class VideoFacialAnalyzer:
    def __init__(self):
        """Initialize MediaPipe Face Landmarker and calibration thresholds."""
        
        # 1. Ensure Model File Exists
        model_path = 'face_landmarker.task'
        if not os.path.exists(model_path):
            print("Downloading MediaPipe Face Landmarker model...")
            url = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task"
            response = requests.get(url)
            with open(model_path, 'wb') as f:
                f.write(response.content)
            print("Model downloaded successfully.")

        # 2. Configure Options
        base_options = python.BaseOptions(model_asset_path=model_path)
        options = vision.FaceLandmarkerOptions(
            base_options=base_options,
            output_face_blendshapes=True,
            output_facial_transformation_matrixes=True,
            num_faces=1,
            min_face_detection_confidence=0.5,
            min_face_presence_confidence=0.5,
            min_tracking_confidence=0.5,
            running_mode=vision.RunningMode.VIDEO 
        )
        
        # 3. Create Detector
        self.detector = vision.FaceLandmarker.create_from_options(options)

        # Thresholds (Updated Calibration)
        self.EAR_THRESHOLD = 0.22       # Blink
        self.MAR_THRESHOLD = 0.45       # Smile

        # 3D Model Points for Pose Estimation
        self.model_points = np.array([
            (0.0, 0.0, 0.0),             # Nose tip
            (0.0, -330.0, -65.0),        # Chin
            (-225.0, 170.0, -135.0),     # Left eye left corner
            (225.0, 170.0, -135.0),      # Right eye right corner
            (-150.0, -150.0, -125.0),    # Left Mouth corner
            (150.0, -150.0, -125.0)      # Right mouth corner
        ], dtype="double")

    def analyze_video(self, video_path, skip_frames=2):
        if not os.path.exists(video_path):
            print(f"Error: File {video_path} not found.")
            return None

        cap = cv2.VideoCapture(video_path)
        fps = cap.get(cv2.CAP_PROP_FPS)
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        
        blink_count = 0
        blink_active = False
        smile_frames = 0
        
        gaze_scores = []
        pitch_history = []
        yaw_history = []
        
        frame_idx = 0
        processed_frames = 0
        frames_with_face = 0

        while cap.isOpened():
            ret, frame = cap.read()
            if not ret: break
            
            frame_idx += 1
            if frame_idx % (skip_frames + 1) != 0: continue
            
            processed_frames += 1
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_frame)
            timestamp_ms = int((frame_idx / fps) * 1000)
            
            detection_result = self.detector.detect_for_video(mp_image, timestamp_ms)

            if detection_result.face_landmarks:
                frames_with_face += 1
                landmarks = detection_result.face_landmarks[0]
                
                # 1. Head Pose (For Posture)
                rot_vec, trans_vec = self._calculate_head_pose(landmarks, width, height)
                pitch, yaw, _ = self._get_euler_angles(rot_vec, trans_vec)
                pitch_history.append(pitch)
                yaw_history.append(yaw)
                
                # 2. Gaze Tracking
                gaze_scores.append(self._calculate_gaze_score(landmarks))
                
                # 3. Blink Detection
                ear = self._calculate_ear(landmarks)
                if ear < self.EAR_THRESHOLD:
                    if not blink_active:
                        blink_count += 1
                        blink_active = True
                else:
                    blink_active = False
                    
                # 4. Smile Detection (Amiability)
                mar = self._calculate_mar(landmarks)
                if mar > self.MAR_THRESHOLD:
                    smile_frames += 1

        cap.release()
        
        if processed_frames == 0 or frames_with_face == 0:
            return None

        # --- REVISED CALCULATION LOGIC ---
        processed_duration_min = (processed_frames * (skip_frames + 1)) / fps / 60
        blink_rate = blink_count / (processed_duration_min if processed_duration_min > 0 else 0.01)
        
        # 1. Professional Posture (1.5 Multiplier - More forgiving)
        pitch_std = np.std(pitch_history) if pitch_history else 0
        yaw_std = np.std(yaw_history) if yaw_history else 0
        movement_penalty = (pitch_std + yaw_std) * 1.5
        posture_score = max(0, 100 - movement_penalty)
        
        # 2. Engagement Score (Gaze + Blink Integration)
        avg_gaze_val = np.mean(gaze_scores) if gaze_scores else 0
        engagement_score = self._calculate_engagement_metric(avg_gaze_val, blink_rate)

        # 3. Liveness Check
        pitch_variance = np.var(pitch_history) if pitch_history else 0
        is_live = "PASS" if pitch_variance > 0.5 else "FAIL"

        smile_pct = (smile_frames / frames_with_face) * 100

        return {
            "liveness_status": is_live,
            "eye_contact_score": float(avg_gaze_val * 100),
            "professional_posture": float(posture_score),
            "blink_rate_bpm": float(blink_rate),
            "friendliness_score": float(smile_pct),
            "engagement_score": float(engagement_score)
        }

    def _calculate_engagement_metric(self, gaze_score, blink_rate):
        """Combines gaze and blink rate into one holistic metric."""
        blink_penalty = abs(blink_rate - 17) * 2 
        engagement = (gaze_score * 100) - blink_penalty
        return max(0, min(100, engagement))

    # --- HELPERS ---
    def _calculate_head_pose(self, lm, w, h):
        image_points = np.array([
            (lm[1].x * w, lm[1].y * h), (lm[152].x * w, lm[152].y * h),
            (lm[33].x * w, lm[33].y * h), (lm[263].x * w, lm[263].y * h),
            (lm[61].x * w, lm[61].y * h), (lm[291].x * w, lm[291].y * h)
        ], dtype="double")
        camera_matrix = np.array([[w, 0, w / 2], [0, w, h / 2], [0, 0, 1]], dtype="double")
        _, rot_vec, trans_vec = cv2.solvePnP(self.model_points, image_points, camera_matrix, np.zeros((4, 1)))
        return rot_vec, trans_vec

    def _get_euler_angles(self, rotation_vector, translation_vector):
        rmat, _ = cv2.Rodrigues(rotation_vector)
        pose_mat = np.hstack((rmat, translation_vector))
        return [x[0] for x in cv2.decomposeProjectionMatrix(pose_mat)[6]]

    def _calculate_gaze_score(self, lm):
        l_pos = (lm[468].x - lm[33].x) / (lm[133].x - lm[33].x) if (lm[133].x - lm[33].x) > 0 else 0
        r_pos = (lm[473].x - lm[362].x) / (lm[263].x - lm[362].x) if (lm[263].x - lm[362].x) > 0 else 0
        score = 1 - (abs(0.5 - ((l_pos + r_pos) / 2.0)) * 3)
        return max(0, min(1, score))

    def _calculate_ear(self, lm):
        v1 = np.linalg.norm(np.array([lm[159].x, lm[159].y]) - np.array([lm[145].x, lm[145].y]))
        v2 = np.linalg.norm(np.array([lm[386].x, lm[386].y]) - np.array([lm[374].x, lm[374].y]))
        h1 = np.linalg.norm(np.array([lm[33].x, lm[33].y]) - np.array([lm[133].x, lm[133].y]))
        h2 = np.linalg.norm(np.array([lm[362].x, lm[362].y]) - np.array([lm[263].x, lm[263].y]))
        return (v1/h1 + v2/h2) / 2.0 if h1 > 0 and h2 > 0 else 0

    def _calculate_mar(self, lm):
        v = np.linalg.norm(np.array([lm[13].x, lm[13].y]) - np.array([lm[14].x, lm[14].y]))
        h = np.linalg.norm(np.array([lm[61].x, lm[61].y]) - np.array([lm[291].x, lm[291].y]))
        return v / h if h > 0 else 0
