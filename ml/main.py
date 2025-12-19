"""
AI Scout - ML Processing Pipeline
Runs on Modal.com GPUs for video analysis

Models:
- YOLOv8x: Player/ball detection (state-of-the-art object detection)
- ViTPose-H: Pose estimation (highest accuracy pose model)
- ByteTrack: Multi-object tracking
- PaddleOCR: Jersey number reading
- Sport-specific action recognition

Pipeline:
1. detect_sport - Classify football vs basketball
2. detect_players - Find all players in frames
3. track_players - Track players across frames
4. read_jerseys - OCR for jersey numbers
5. estimate_pose - Body keypoints for each player
6. segment_plays - Break video into plays/possessions
7. analyze_players - Extract metrics per player
8. generate_reports - Claude API for natural language reports
"""

import modal
from modal import Image, App, gpu, Secret, web_endpoint
from typing import Optional
import json

# Create Modal app
app = App("ai-scout")

# Base image with ML dependencies
ml_image = (
    Image.debian_slim(python_version="3.11")
    .apt_install(["libgl1-mesa-glx", "libglib2.0-0", "ffmpeg"])
    .pip_install([
        # Core ML
        "torch==2.1.2",
        "torchvision==0.16.2",
        "numpy>=1.24.0",
        "opencv-python-headless>=4.8.0",

        # Detection & Tracking
        "ultralytics>=8.0.200",  # YOLOv8
        "supervision>=0.17.0",    # Tracking utilities

        # Pose Estimation
        "mmpose>=1.2.0",
        "mmcv>=2.1.0",
        "mmdet>=3.2.0",

        # OCR
        "paddlepaddle>=2.5.0",
        "paddleocr>=2.7.0",

        # Video processing
        "ffmpeg-python>=0.2.0",
        "av>=11.0.0",

        # API & Utils
        "httpx>=0.25.0",
        "anthropic>=0.8.0",
        "pydantic>=2.5.0",
    ])
)

# Lightweight image for webhooks
webhook_image = Image.debian_slim().pip_install([
    "httpx>=0.25.0",
    "pydantic>=2.5.0",
])


@app.cls(
    image=ml_image,
    gpu=gpu.A10G(),
    timeout=3600,
    secrets=[Secret.from_name("ai-scout-secrets")],
)
class VideoProcessor:
    """Main video processing class with all ML models."""

    def __init__(self):
        self.yolo = None
        self.pose_model = None
        self.ocr = None
        self.tracker = None

    @modal.enter()
    def load_models(self):
        """Load all models on container startup."""
        from ultralytics import YOLO
        import supervision as sv
        from paddleocr import PaddleOCR

        print("Loading YOLOv8x model for player detection...")
        self.yolo = YOLO("yolov8x.pt")

        print("Loading YOLOv8x-pose model for pose estimation...")
        # Use YOLO's built-in pose model (faster and more reliable than ViTPose for our use case)
        self.pose_model = YOLO("yolov8x-pose.pt")

        print("Loading PaddleOCR for jersey number reading...")
        self.ocr = PaddleOCR(use_angle_cls=True, lang='en', show_log=False)

        print("Initializing ByteTrack for multi-object tracking...")
        self.tracker = sv.ByteTrack()

        print("All models loaded!")

    @modal.method()
    def estimate_pose(self, frame_bytes: bytes) -> dict:
        """Estimate pose keypoints for players in a frame.

        Returns keypoints for:
        - 17 COCO keypoints: nose, eyes, ears, shoulders, elbows, wrists, hips, knees, ankles
        - Confidence scores for each keypoint
        """
        import cv2
        import numpy as np

        nparr = np.frombuffer(frame_bytes, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        # Run pose estimation
        results = self.pose_model(frame, conf=0.5)[0]

        poses = []
        if results.keypoints is not None:
            for i, kps in enumerate(results.keypoints.data):
                keypoints = {}
                keypoint_names = [
                    'nose', 'left_eye', 'right_eye', 'left_ear', 'right_ear',
                    'left_shoulder', 'right_shoulder', 'left_elbow', 'right_elbow',
                    'left_wrist', 'right_wrist', 'left_hip', 'right_hip',
                    'left_knee', 'right_knee', 'left_ankle', 'right_ankle'
                ]

                for j, name in enumerate(keypoint_names):
                    if j < len(kps):
                        x, y, conf = kps[j].tolist()
                        keypoints[name] = {
                            'x': float(x),
                            'y': float(y),
                            'confidence': float(conf)
                        }

                # Get bounding box if available
                bbox = None
                if results.boxes is not None and i < len(results.boxes):
                    bbox = results.boxes[i].xyxy[0].tolist()

                poses.append({
                    'keypoints': keypoints,
                    'bbox': bbox,
                })

        return {'poses': poses}

    @modal.method()
    def detect_players(self, frame_bytes: bytes) -> dict:
        """Detect players in a single frame."""
        import cv2
        import numpy as np

        # Decode frame
        nparr = np.frombuffer(frame_bytes, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        # Run YOLO detection (class 0 = person)
        results = self.yolo(frame, classes=[0], conf=0.5)[0]

        detections = []
        for box in results.boxes:
            x1, y1, x2, y2 = box.xyxy[0].tolist()
            conf = float(box.conf[0])
            detections.append({
                "bbox": [x1, y1, x2, y2],
                "confidence": conf,
                "class": "player"
            })

        return {"detections": detections}

    @modal.method()
    def read_jersey_number(self, player_crop_bytes: bytes) -> dict:
        """Read jersey number from a cropped player image."""
        import cv2
        import numpy as np

        nparr = np.frombuffer(player_crop_bytes, np.uint8)
        crop = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        # Run OCR
        result = self.ocr.ocr(crop, cls=True)

        numbers = []
        if result and result[0]:
            for line in result[0]:
                text = line[1][0]
                conf = line[1][1]
                # Filter for jersey numbers (1-2 digits)
                if text.isdigit() and len(text) <= 2:
                    numbers.append({
                        "number": text,
                        "confidence": conf
                    })

        # Return highest confidence number
        if numbers:
            best = max(numbers, key=lambda x: x["confidence"])
            return {"jersey_number": best["number"], "confidence": best["confidence"]}

        return {"jersey_number": None, "confidence": 0}

    @modal.method()
    def process_video(self, video_url: str, game_id: str, webhook_url: str) -> dict:
        """Full video processing pipeline."""
        import cv2
        import httpx
        import tempfile
        import os

        # Download video
        print(f"Downloading video from {video_url[:50]}...")
        with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as f:
            response = httpx.get(video_url, follow_redirects=True)
            f.write(response.content)
            video_path = f.name

        try:
            cap = cv2.VideoCapture(video_path)
            fps = cap.get(cv2.CAP_PROP_FPS)
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            duration = total_frames / fps if fps > 0 else 0

            print(f"Video: {total_frames} frames, {fps} fps, {duration:.1f}s duration")

            # Sample frames for processing (every 0.5 seconds)
            sample_interval = max(1, int(fps / 2))

            all_detections = []
            frame_idx = 0

            while True:
                ret, frame = cap.read()
                if not ret:
                    break

                if frame_idx % sample_interval == 0:
                    # Encode frame
                    _, buffer = cv2.imencode('.jpg', frame)
                    frame_bytes = buffer.tobytes()

                    # Detect players
                    result = self.detect_players(frame_bytes)

                    # Add timestamp
                    timestamp = frame_idx / fps
                    for det in result["detections"]:
                        det["timestamp"] = timestamp
                        det["frame"] = frame_idx

                    all_detections.extend(result["detections"])

                    # Every 5 sample frames, also run pose estimation
                    if (frame_idx // sample_interval) % 5 == 0:
                        pose_result = self.estimate_pose(frame_bytes)
                        # Could store poses for action recognition
                        # For now, just log how many poses detected
                        if pose_result["poses"]:
                            print(f"Frame {frame_idx}: {len(pose_result['poses'])} poses detected")

                    # Report progress
                    progress = int((frame_idx / total_frames) * 100)
                    if frame_idx % (sample_interval * 10) == 0:
                        print(f"Progress: {progress}% ({frame_idx}/{total_frames})")
                        # Send progress update
                        try:
                            httpx.post(webhook_url, json={
                                "game_id": game_id,
                                "status": "tracking",
                                "progress": progress,
                            }, timeout=5)
                        except:
                            pass

                frame_idx += 1

            cap.release()

            # Process detections into player tracks
            # (simplified - real implementation would use ByteTrack)
            player_data = self._aggregate_detections(all_detections)

            # Send final results
            httpx.post(webhook_url, json={
                "game_id": game_id,
                "status": "analyzing",
                "progress": 100,
                "players": player_data,
                "duration_seconds": duration,
                "total_frames": total_frames,
            }, timeout=30)

            return {
                "success": True,
                "players_detected": len(player_data),
                "frames_processed": frame_idx,
            }

        finally:
            os.unlink(video_path)

    def _aggregate_detections(self, detections: list) -> list:
        """Aggregate frame detections into player tracks."""
        # Simplified aggregation - real implementation would use proper tracking
        # Group detections by approximate position
        from collections import defaultdict

        tracks = defaultdict(list)
        for det in detections:
            # Simple position-based grouping
            cx = (det["bbox"][0] + det["bbox"][2]) / 2
            cy = (det["bbox"][1] + det["bbox"][3]) / 2
            track_key = f"{int(cx / 100)}_{int(cy / 100)}"
            tracks[track_key].append(det)

        players = []
        for i, (track_id, dets) in enumerate(tracks.items()):
            if len(dets) >= 3:  # Minimum detections to count as a player
                players.append({
                    "track_id": i + 1,
                    "detections": len(dets),
                    "first_seen": min(d["timestamp"] for d in dets),
                    "last_seen": max(d["timestamp"] for d in dets),
                    "avg_confidence": sum(d["confidence"] for d in dets) / len(dets),
                })

        return players


@app.function(image=webhook_image, secrets=[Secret.from_name("ai-scout-secrets")])
@web_endpoint(method="POST")
def trigger_processing(request: dict):
    """Webhook endpoint to trigger video processing."""
    import os

    game_id = request.get("game_id")
    video_url = request.get("video_url")
    webhook_url = request.get("webhook_url", os.environ.get("WEBHOOK_URL"))

    if not game_id or not video_url:
        return {"error": "Missing game_id or video_url"}

    # Spawn processing job
    processor = VideoProcessor()
    processor.process_video.spawn(video_url, game_id, webhook_url)

    return {
        "success": True,
        "message": f"Processing started for game {game_id}",
    }


@app.function(image=webhook_image)
def health_check():
    """Simple health check."""
    return {"status": "healthy", "service": "ai-scout-ml"}


if __name__ == "__main__":
    # For local testing
    print("AI Scout ML Pipeline")
    print("Deploy with: modal deploy main.py")
    print("Test locally with: modal serve main.py")
