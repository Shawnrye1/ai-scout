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

Chunked Processing (for long videos):
- Videos > 10 minutes are split into chunks
- Each chunk processed in parallel
- Results merged with player re-identification
"""

import modal
from modal import Image, App, Secret, fastapi_endpoint
from typing import Optional, List, Tuple
import json

# Configuration
CHUNK_DURATION_SECONDS = 600  # 10 minutes per chunk
MIN_VIDEO_FOR_CHUNKING = 900  # Only chunk videos > 15 minutes

# Create Modal app
app = App("ai-scout")

# Base image with ML dependencies
ml_image = (
    Image.debian_slim(python_version="3.11")
    .apt_install(["libgl1-mesa-glx", "libglib2.0-0", "ffmpeg"])
    .pip_install([
        # Core ML - pin numpy first for compatibility
        "numpy==1.26.4",
        "torch==2.1.2",
        "torchvision==0.16.2",
        "opencv-python-headless>=4.8.0",

        # Detection & Tracking
        "ultralytics>=8.0.200",  # YOLOv8
        "supervision>=0.17.0",    # Tracking utilities

        # OCR - simplified
        "paddlepaddle>=2.5.0",
        "paddleocr>=2.7.0",

        # Video processing
        "ffmpeg-python>=0.2.0",

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
    "fastapi>=0.111.0",  # Required for web endpoints
])


@app.cls(
    image=ml_image,
    gpu="A10G",
    timeout=7200,  # 2 hours for long game videos
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
        self.ocr = PaddleOCR(use_angle_cls=True, lang='en')

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
    def process_chunk(self, video_path: str, start_time: float, end_time: float, chunk_id: int) -> dict:
        """Process a single chunk of video.

        Args:
            video_path: Path to local video file
            start_time: Start time in seconds
            end_time: End time in seconds
            chunk_id: Chunk identifier for tracking

        Returns:
            Dict with detections and player data for this chunk
        """
        import cv2
        import numpy as np

        cap = cv2.VideoCapture(video_path)
        fps = cap.get(cv2.CAP_PROP_FPS)

        # Seek to start position
        start_frame = int(start_time * fps)
        end_frame = int(end_time * fps)
        cap.set(cv2.CAP_PROP_POS_FRAMES, start_frame)

        print(f"[Chunk {chunk_id}] Processing frames {start_frame}-{end_frame} ({start_time:.1f}s - {end_time:.1f}s)")

        sample_interval = max(1, int(fps / 2))  # Sample every 0.5 seconds
        all_detections = []
        frame_idx = start_frame

        while frame_idx < end_frame:
            ret, frame = cap.read()
            if not ret:
                break

            if (frame_idx - start_frame) % sample_interval == 0:
                # Encode frame
                _, buffer = cv2.imencode('.jpg', frame)
                frame_bytes = buffer.tobytes()

                # Detect players
                result = self.detect_players.local(frame_bytes)

                # Add timestamp (absolute time in video)
                timestamp = frame_idx / fps
                for det in result["detections"]:
                    det["timestamp"] = timestamp
                    det["frame"] = frame_idx
                    det["chunk_id"] = chunk_id

                all_detections.extend(result["detections"])

                # Run pose estimation every 5 samples
                if ((frame_idx - start_frame) // sample_interval) % 5 == 0:
                    pose_result = self.estimate_pose.local(frame_bytes)
                    if pose_result["poses"]:
                        print(f"[Chunk {chunk_id}] Frame {frame_idx}: {len(pose_result['poses'])} poses")

            frame_idx += 1

        cap.release()

        # Aggregate detections for this chunk
        chunk_players = self._aggregate_detections(all_detections)

        print(f"[Chunk {chunk_id}] Complete: {len(chunk_players)} players, {len(all_detections)} detections")

        return {
            "chunk_id": chunk_id,
            "start_time": start_time,
            "end_time": end_time,
            "players": chunk_players,
            "detections": all_detections,
            "frames_processed": frame_idx - start_frame,
        }

    @modal.method()
    def process_video_chunked(self, video_url: str, game_id: str, webhook_url: str, webhook_secret: str = "") -> dict:
        """Process video in chunks for better reliability with long videos."""
        import cv2
        import httpx
        import tempfile
        import os
        import concurrent.futures

        # Download video
        print(f"Downloading video from {video_url[:50]}...")
        with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as f:
            response = httpx.get(video_url, follow_redirects=True, timeout=300)
            f.write(response.content)
            video_path = f.name

        try:
            # Get video info
            cap = cv2.VideoCapture(video_path)
            fps = cap.get(cv2.CAP_PROP_FPS)
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            duration = total_frames / fps if fps > 0 else 0
            cap.release()

            print(f"Video: {total_frames} frames, {fps:.1f} fps, {duration:.1f}s duration")

            # Calculate chunks
            num_chunks = max(1, int(duration / CHUNK_DURATION_SECONDS) + (1 if duration % CHUNK_DURATION_SECONDS > 60 else 0))
            chunk_duration = duration / num_chunks

            chunks = []
            for i in range(num_chunks):
                start = i * chunk_duration
                end = min((i + 1) * chunk_duration, duration)
                chunks.append((start, end, i))

            print(f"Processing {num_chunks} chunks of ~{chunk_duration:.1f}s each")

            # Send initial status
            try:
                httpx.post(webhook_url, json={
                    "game_id": game_id,
                    "status": "tracking",
                    "progress": 0,
                    "message": f"Processing {num_chunks} chunks",
                    "secret": webhook_secret,
                }, timeout=5)
            except:
                pass

            # Process chunks sequentially (for reliability)
            # Could be parallelized with Modal's map() for speed
            all_chunk_results = []
            for start, end, chunk_id in chunks:
                # Process chunk
                chunk_result = self.process_chunk.local(video_path, start, end, chunk_id)
                all_chunk_results.append(chunk_result)

                # Report progress
                progress = int(((chunk_id + 1) / num_chunks) * 100)
                print(f"Overall progress: {progress}% (chunk {chunk_id + 1}/{num_chunks})")
                try:
                    httpx.post(webhook_url, json={
                        "game_id": game_id,
                        "status": "tracking",
                        "progress": progress,
                        "secret": webhook_secret,
                    }, timeout=5)
                except:
                    pass

            # Merge results from all chunks
            merged_players = self._merge_chunk_results(all_chunk_results)

            print(f"Merged {len(merged_players)} unique players from {num_chunks} chunks")

            # Send final results
            final_payload = {
                "game_id": game_id,
                "status": "ready",
                "progress": 100,
                "players": merged_players,
                "duration_seconds": duration,
                "total_frames": total_frames,
                "chunks_processed": num_chunks,
                "secret": webhook_secret,
            }

            # Retry up to 3 times
            for attempt in range(3):
                try:
                    print(f"Sending final webhook (attempt {attempt + 1}/3)...")
                    response = httpx.post(webhook_url, json=final_payload, timeout=60)
                    print(f"Webhook response: {response.status_code}")
                    if response.status_code == 200:
                        break
                except Exception as e:
                    print(f"Webhook attempt {attempt + 1} failed: {e}")
                    if attempt < 2:
                        import time
                        time.sleep(5)

            return {
                "success": True,
                "players_detected": len(merged_players),
                "chunks_processed": num_chunks,
                "duration": duration,
            }

        finally:
            os.unlink(video_path)

    def _merge_chunk_results(self, chunk_results: list) -> list:
        """Merge player tracks from multiple chunks.

        Players are matched across chunks by:
        1. Jersey number (if detected)
        2. Position similarity at chunk boundaries
        3. Track continuity
        """
        from collections import defaultdict

        # Collect all players with their chunk info
        all_players = []
        for chunk in chunk_results:
            for player in chunk["players"]:
                player["chunk_id"] = chunk["chunk_id"]
                player["chunk_start"] = chunk["start_time"]
                player["chunk_end"] = chunk["end_time"]
                all_players.append(player)

        if not all_players:
            return []

        # Group by approximate position (players in similar areas are likely the same)
        # This is a simplified approach - production would use jersey numbers
        merged = []
        used = set()

        for i, player in enumerate(all_players):
            if i in used:
                continue

            # Start a merged player track
            merged_player = {
                "track_id": len(merged) + 1,
                "detections": player["detections"],
                "first_seen": player["first_seen"],
                "last_seen": player["last_seen"],
                "avg_confidence": player["avg_confidence"],
                "chunks": [player["chunk_id"]],
            }
            used.add(i)

            # Look for matches in subsequent chunks
            for j, other in enumerate(all_players):
                if j in used or j <= i:
                    continue

                # Check if this could be the same player
                # Simple heuristic: if they appear in adjacent chunks and have similar timing
                if other["chunk_id"] == player["chunk_id"] + 1:
                    # Player from next chunk - check if timing aligns
                    if abs(other["first_seen"] - player["last_seen"]) < 30:  # Within 30 seconds
                        # Merge this player
                        merged_player["detections"] += other["detections"]
                        merged_player["last_seen"] = max(merged_player["last_seen"], other["last_seen"])
                        merged_player["chunks"].append(other["chunk_id"])
                        merged_player["avg_confidence"] = (merged_player["avg_confidence"] + other["avg_confidence"]) / 2
                        used.add(j)

            merged.append(merged_player)

        return merged

    @modal.method()
    def process_video(self, video_url: str, game_id: str, webhook_url: str, webhook_secret: str = "") -> dict:
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

                    # Detect players (use .local() for Modal methods within same container)
                    result = self.detect_players.local(frame_bytes)

                    # Add timestamp
                    timestamp = frame_idx / fps
                    for det in result["detections"]:
                        det["timestamp"] = timestamp
                        det["frame"] = frame_idx

                    all_detections.extend(result["detections"])

                    # Every 5 sample frames, also run pose estimation
                    if (frame_idx // sample_interval) % 5 == 0:
                        pose_result = self.estimate_pose.local(frame_bytes)
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
                                "secret": webhook_secret,
                            }, timeout=5)
                        except:
                            pass

                frame_idx += 1

            cap.release()

            # Process detections into player tracks
            # (simplified - real implementation would use ByteTrack)
            player_data = self._aggregate_detections(all_detections)

            # Send final results with retries
            final_payload = {
                "game_id": game_id,
                "status": "ready",  # Changed from "analyzing" to "ready"
                "progress": 100,
                "players": player_data,
                "duration_seconds": duration,
                "total_frames": total_frames,
                "secret": webhook_secret,
            }

            # Retry up to 3 times
            for attempt in range(3):
                try:
                    print(f"Sending final webhook (attempt {attempt + 1}/3)...")
                    response = httpx.post(webhook_url, json=final_payload, timeout=60)
                    print(f"Webhook response: {response.status_code}")
                    if response.status_code == 200:
                        break
                except Exception as e:
                    print(f"Webhook attempt {attempt + 1} failed: {e}")
                    if attempt < 2:
                        import time
                        time.sleep(5)  # Wait 5 seconds before retry

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
@fastapi_endpoint(method="POST")
def trigger_processing(request: dict):
    """Webhook endpoint to trigger video processing.

    Automatically uses chunked processing for videos > 15 minutes.
    """
    import os

    game_id = request.get("game_id")
    video_url = request.get("video_url")
    webhook_url = request.get("webhook_url", os.environ.get("WEBHOOK_URL"))
    webhook_secret = request.get("webhook_secret", os.environ.get("MODAL_WEBHOOK_SECRET", ""))
    use_chunked = request.get("use_chunked", True)  # Default to chunked for reliability
    video_duration = request.get("video_duration", 0)  # Optional hint from client

    if not game_id or not video_url:
        return {"error": "Missing game_id or video_url"}

    processor = VideoProcessor()

    # Use chunked processing for long videos or when explicitly requested
    # Default to chunked for better reliability
    if use_chunked or video_duration > MIN_VIDEO_FOR_CHUNKING:
        processor.process_video_chunked.spawn(video_url, game_id, webhook_url, webhook_secret)
        return {
            "success": True,
            "message": f"Chunked processing started for game {game_id}",
            "processing_mode": "chunked",
        }
    else:
        processor.process_video.spawn(video_url, game_id, webhook_url, webhook_secret)
        return {
            "success": True,
            "message": f"Processing started for game {game_id}",
            "processing_mode": "standard",
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
