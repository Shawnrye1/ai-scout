"""
AI Scout - Label Studio ML Backend for Pre-labeling

This Modal app serves as an ML backend for Label Studio, providing
automatic pre-annotations for video clips using YOLOv8x.

How it works:
1. Label Studio calls /predict with video URL and frame info
2. We extract frames from the video
3. Run YOLOv8x detection on each frame
4. Return predictions in Label Studio's expected format

Deploy: modal deploy ml_backend.py
"""

import modal
from modal import Image, App, Secret
from typing import List, Dict, Any, Optional
import json

# Create Modal app for ML backend
app = App("ai-scout-ml-backend")

# ML image with all dependencies
ml_backend_image = (
    Image.debian_slim(python_version="3.11")
    .apt_install(["libgl1-mesa-glx", "libglib2.0-0", "ffmpeg"])
    .pip_install([
        # Core ML
        "numpy==1.26.4",
        "torch==2.1.2",
        "torchvision==0.16.2",
        "opencv-python-headless>=4.8.0",

        # Detection & Tracking
        "ultralytics>=8.0.200",
        "supervision>=0.17.0",  # ByteTrack for persistent tracking

        # OCR for jersey numbers (v2 - force rebuild)
        "paddleocr>=2.7.0",
        "paddlepaddle>=2.5.0",

        # Web server
        "fastapi>=0.111.0",
        "uvicorn>=0.30.0",
        "httpx>=0.25.0",
        "pydantic>=2.5.0",
    ])
)


# Global model holder (loaded once on container startup)
_yolo_model = None


def _load_models():
    """Load ML models into global variables."""
    global _yolo_model

    if _yolo_model is None:
        from ultralytics import YOLO
        print("[ML Backend] Loading YOLOv8x model...")
        _yolo_model = YOLO("yolov8x.pt")
        print("[ML Backend] YOLOv8x loaded!")

    return _yolo_model


def read_jersey_number(player_crop) -> tuple:
    """Read jersey number from a cropped player image.

    NOTE: OCR disabled for now to reduce container size/startup time.
    Jersey numbers will need to be entered manually in Label Studio.

    Args:
        player_crop: OpenCV image of cropped player

    Returns:
        Tuple of (jersey_number, confidence) - currently always (None, 0)
    """
    # OCR disabled - return None for now
    return None, 0


def predict_frame(yolo, frame, frame_number: int = 0) -> List[Dict]:
    """Run detection on a single frame.

    Args:
        yolo: YOLO model instance
        frame: OpenCV image (BGR)
        frame_number: Frame number in the video

    Returns:
        List of detections with bboxes
    """
    if frame is None:
        return []

    height, width = frame.shape[:2]

    # Run YOLO detection (class 0 = person)
    results = yolo(frame, classes=[0], conf=0.3, verbose=False)[0]

    detections = []
    for box in results.boxes:
        x1, y1, x2, y2 = box.xyxy[0].tolist()
        confidence = float(box.conf[0])

        # Convert to Label Studio percentage format (0-100)
        det = {
            "x": (x1 / width) * 100,
            "y": (y1 / height) * 100,
            "width": ((x2 - x1) / width) * 100,
            "height": ((y2 - y1) / height) * 100,
            "frame": frame_number,
            "confidence": confidence,
            "label": "Player",
            "jersey_number": None,  # OCR disabled for now
        }
        detections.append(det)

    return detections


def predict_video(yolo, video_url: str, keyframe_rate: int = 10) -> Dict[str, Any]:
    """Run detection + tracking + jersey number OCR on video.

    Pipeline:
    1. Track ALL frames with BoT-SORT for continuity
    2. Read jersey numbers on keyframes
    3. Use jersey numbers to anchor player identity
    4. Output tracked sequences for Label Studio

    Args:
        yolo: YOLO model instance
        video_url: URL to video file (presigned R2 URL)
        keyframe_rate: Save keyframes every N frames (default 10)

    Returns:
        Label Studio prediction format with tracked sequences
    """
    import cv2
    import httpx
    import tempfile
    import os
    from collections import defaultdict, Counter

    print(f"[ML Backend] Downloading video from {video_url[:80]}...")

    # Download video to temp file
    with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as f:
        response = httpx.get(video_url, follow_redirects=True, timeout=120)
        f.write(response.content)
        video_path = f.name

    # Try to initialize OCR (optional - tracking works without it)
    ocr = None
    try:
        print("[ML Backend] Attempting to load PaddleOCR...")
        from paddleocr import PaddleOCR
        # Note: PaddleOCR 3.x removed show_log parameter
        ocr = PaddleOCR(use_angle_cls=True, lang='en')
        print("[ML Backend] PaddleOCR loaded successfully!")
    except Exception as e:
        print(f"[ML Backend] WARNING: PaddleOCR failed to load: {e}")
        print("[ML Backend] Continuing without jersey OCR...")

    try:

        cap = cv2.VideoCapture(video_path)
        fps = cap.get(cv2.CAP_PROP_FPS) or 30
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

        print(f"[ML Backend] Video: {total_frames} frames, {fps:.1f} fps")
        ocr_status = "enabled" if ocr is not None else "disabled"
        print(f"[ML Backend] Using BoT-SORT tracking, OCR {ocr_status}")

        # Store detections grouped by track_id
        tracks = defaultdict(list)
        # Store jersey number readings per track for voting
        jersey_readings = defaultdict(list)
        frame_idx = 0

        while True:
            ret, frame = cap.read()
            if not ret:
                break

            height, width = frame.shape[:2]

            # Track EVERY frame for continuity
            results = yolo.track(
                frame,
                classes=[0],
                conf=0.25,
                persist=True,
                tracker="botsort.yaml",
                verbose=False
            )[0]

            is_keyframe = (frame_idx % keyframe_rate == 0)

            if results.boxes is not None and len(results.boxes) > 0 and results.boxes.id is not None:
                boxes = results.boxes

                if is_keyframe:
                    for i in range(len(boxes)):
                        track_id = int(boxes.id[i].item()) if boxes.id[i] is not None else None
                        if track_id is None:
                            continue

                        x1, y1, x2, y2 = boxes.xyxy[i].tolist()
                        conf = float(boxes.conf[i].item())

                        # Store detection
                        tracks[track_id].append({
                            "frame": frame_idx,
                            "x": (x1 / width) * 100,
                            "y": (y1 / height) * 100,
                            "width": ((x2 - x1) / width) * 100,
                            "height": ((y2 - y1) / height) * 100,
                            "confidence": conf,
                        })

                        # Try to read jersey number (every 3rd keyframe for more chances)
                        if ocr is not None and frame_idx % (keyframe_rate * 3) == 0:
                            # Crop player region - focus on upper body for jersey
                            x1i, y1i, x2i, y2i = int(x1), int(y1), int(x2), int(y2)
                            # Upper 60% of box is more likely to show jersey number
                            jersey_y2 = y1i + int((y2i - y1i) * 0.6)

                            if x2i > x1i and jersey_y2 > y1i:
                                crop = frame[y1i:jersey_y2, x1i:x2i]
                                if crop.size > 0:
                                    try:
                                        # PaddleOCR 3.x API - use predict() or ocr()
                                        ocr_result = ocr.ocr(crop)
                                        if ocr_result and ocr_result[0]:
                                            for line in ocr_result[0]:
                                                # Handle different result formats
                                                if isinstance(line, dict):
                                                    text = str(line.get('text', '')).strip()
                                                    ocr_conf = float(line.get('score', 0))
                                                elif isinstance(line, (list, tuple)) and len(line) >= 2:
                                                    text = str(line[1][0]).strip() if isinstance(line[1], (list, tuple)) else str(line[1]).strip()
                                                    ocr_conf = float(line[1][1]) if isinstance(line[1], (list, tuple)) and len(line[1]) > 1 else 0.5
                                                else:
                                                    continue
                                                # Look for 1-2 digit numbers (jersey numbers)
                                                if text.isdigit() and len(text) <= 2 and ocr_conf > 0.4:
                                                    jersey_readings[track_id].append(text)
                                                    print(f"[OCR] Track {track_id}: read '{text}' (conf={ocr_conf:.2f})")
                                    except Exception as e:
                                        print(f"[OCR] Error on track {track_id}: {e}")

                # Log progress
                if frame_idx % 30 == 0:
                    ids = [int(x.item()) for x in boxes.id if x is not None]
                    print(f"[ML Backend] Frame {frame_idx}: {len(ids)} tracked")

            frame_idx += 1

        cap.release()

        # Vote on jersey numbers for each track
        track_jerseys = {}
        for track_id, readings in jersey_readings.items():
            if readings:
                # Most common number wins
                most_common = Counter(readings).most_common(1)[0]
                track_jerseys[track_id] = most_common[0]
                print(f"[ML Backend] Track {track_id} -> Jersey #{most_common[0]} ({most_common[1]} votes)")

        print(f"[ML Backend] Complete: {len(tracks)} tracks, {len(track_jerseys)} with jersey numbers")

        # Merge fragmented tracks that share the same jersey number
        if track_jerseys:
            merged_tracks = merge_tracks_by_jersey(tracks, track_jerseys)
            print(f"[ML Backend] After jersey merge: {len(merged_tracks)} tracks")
        else:
            merged_tracks = tracks

        # Convert tracks to Label Studio format
        return format_predictions_simple(merged_tracks, total_frames, fps, track_jerseys=track_jerseys)

    finally:
        os.unlink(video_path)


def merge_tracks_by_jersey(tracks: Dict[int, List[Dict]], track_jerseys: Dict[int, str]) -> Dict[int, List[Dict]]:
    """Merge tracks that have the same jersey number.

    When the tracker loses a player and re-acquires them with a new ID,
    we can merge these fragments using jersey number as the anchor.
    """
    from collections import defaultdict

    # Group tracks by jersey number
    jersey_to_tracks = defaultdict(list)
    for track_id, jersey in track_jerseys.items():
        if track_id in tracks:
            jersey_to_tracks[jersey].append(track_id)

    # Merge tracks with same jersey
    merged = {}
    merged_track_ids = set()

    for jersey, track_ids in jersey_to_tracks.items():
        if len(track_ids) > 1:
            # Merge all tracks for this jersey into one
            primary_id = track_ids[0]
            all_frames = []
            for tid in track_ids:
                all_frames.extend(tracks[tid])
                merged_track_ids.add(tid)
            # Sort by frame and remove duplicates (keep higher confidence)
            frame_map = {}
            for f in all_frames:
                frame_num = f["frame"]
                if frame_num not in frame_map or f["confidence"] > frame_map[frame_num]["confidence"]:
                    frame_map[frame_num] = f
            merged[primary_id] = list(frame_map.values())
            print(f"[Merge] Jersey #{jersey}: merged {len(track_ids)} tracks -> {len(merged[primary_id])} frames")
        else:
            # Single track, no merge needed
            merged[track_ids[0]] = tracks[track_ids[0]]
            merged_track_ids.add(track_ids[0])

    # Add tracks without jersey numbers
    for track_id, frames in tracks.items():
        if track_id not in merged_track_ids:
            merged[track_id] = frames

    # Now do spatial merging for remaining tracks
    merged = merge_tracks_by_proximity(merged, merged_track_ids)

    return merged


def merge_tracks_by_proximity(tracks: Dict[int, List[Dict]], already_merged: set) -> Dict[int, List[Dict]]:
    """Merge temporally adjacent tracks that are spatially close.

    For tracks without jersey numbers, merge if:
    1. Track A ends within 30 frames of track B starting
    2. The end position of A is close to start position of B
    """
    # Get track time ranges and positions
    track_info = {}
    for track_id, frames in tracks.items():
        if track_id in already_merged:
            continue  # Skip already merged jersey tracks
        if not frames:
            continue
        sorted_frames = sorted(frames, key=lambda f: f["frame"])
        track_info[track_id] = {
            "start_frame": sorted_frames[0]["frame"],
            "end_frame": sorted_frames[-1]["frame"],
            "start_pos": (sorted_frames[0]["x"], sorted_frames[0]["y"]),
            "end_pos": (sorted_frames[-1]["x"], sorted_frames[-1]["y"]),
            "frames": sorted_frames
        }

    if not track_info:
        return tracks

    # Find mergeable pairs
    merged_into = {}  # track_id -> primary_track_id
    MAX_GAP = 30  # frames
    MAX_DIST = 10  # percent of frame

    track_ids = list(track_info.keys())
    for i, tid_a in enumerate(track_ids):
        if tid_a in merged_into:
            continue
        info_a = track_info[tid_a]

        for tid_b in track_ids[i+1:]:
            if tid_b in merged_into:
                continue
            info_b = track_info[tid_b]

            # Check if A ends before B starts (with small gap)
            gap = info_b["start_frame"] - info_a["end_frame"]
            if 0 < gap <= MAX_GAP:
                # Check spatial proximity
                dist = ((info_a["end_pos"][0] - info_b["start_pos"][0])**2 +
                        (info_a["end_pos"][1] - info_b["start_pos"][1])**2) ** 0.5
                if dist < MAX_DIST:
                    merged_into[tid_b] = tid_a
                    print(f"[Spatial Merge] Track {tid_b} -> Track {tid_a} (gap={gap}, dist={dist:.1f})")

            # Check if B ends before A starts
            gap = info_a["start_frame"] - info_b["end_frame"]
            if 0 < gap <= MAX_GAP:
                dist = ((info_b["end_pos"][0] - info_a["start_pos"][0])**2 +
                        (info_b["end_pos"][1] - info_a["start_pos"][1])**2) ** 0.5
                if dist < MAX_DIST:
                    merged_into[tid_a] = tid_b
                    print(f"[Spatial Merge] Track {tid_a} -> Track {tid_b} (gap={gap}, dist={dist:.1f})")
                    break

    # Apply merges
    result = dict(tracks)
    for merge_from, merge_to in merged_into.items():
        if merge_from in result and merge_to in result:
            # Combine frames
            combined = result[merge_to] + result[merge_from]
            # Remove duplicates
            frame_map = {}
            for f in combined:
                frame_num = f["frame"]
                if frame_num not in frame_map or f["confidence"] > frame_map[frame_num]["confidence"]:
                    frame_map[frame_num] = f
            result[merge_to] = list(frame_map.values())
            del result[merge_from]

    return result


def format_predictions_simple(tracks: Dict[int, List[Dict]], total_frames: int, fps: float, max_tracks: int = 13, track_jerseys: Dict[int, str] = None) -> Dict[str, Any]:
    """Format tracks for Label Studio videorectangle format.

    For basketball: 10 players + 2-3 refs = ~13 max entities on court.

    Filters applied:
    1. Minimum box size (ignore distant/small people)
    2. Court region filter (ignore sidelines - top 15% of frame)
    3. Keep top N by detection count + size
    4. Label with jersey number if detected
    """
    if track_jerseys is None:
        track_jerseys = {}

    if not tracks:
        print("[ML Backend] WARNING: No tracks to format!")
        return {"model_version": "yolov8x-jersey-v3", "result": []}

    duration = total_frames / fps if fps > 0 else 0

    # Score tracks with filters for on-court players
    scored_tracks = []
    for track_id, frames in tracks.items():
        if len(frames) < 2:  # Skip single-frame noise
            continue

        # Calculate average position and size
        avg_y = sum(f["y"] for f in frames) / len(frames)
        avg_size = sum(f["width"] * f["height"] for f in frames) / len(frames)
        avg_width = sum(f["width"] for f in frames) / len(frames)
        avg_height = sum(f["height"] for f in frames) / len(frames)

        # FILTER 1: Skip boxes that are too small (distant people/fans)
        # On-court players should have width > 3% and height > 5% of frame
        if avg_width < 3 or avg_height < 5:
            print(f"  Skip track {track_id}: too small (w={avg_width:.1f}%, h={avg_height:.1f}%)")
            continue

        # FILTER 2: Skip boxes in top 15% of frame (usually crowd/stands)
        if avg_y < 15:
            print(f"  Skip track {track_id}: in crowd area (y={avg_y:.1f}%)")
            continue

        # Score: prioritize larger boxes (on-court) + more detections (persistent)
        score = (avg_size * 2) + (len(frames) * 10)

        scored_tracks.append({
            "track_id": track_id,
            "frames": frames,
            "num_detections": len(frames),
            "avg_size": avg_size,
            "avg_y": avg_y,
            "score": score
        })

    # Sort by score and keep top N
    scored_tracks.sort(key=lambda t: t["score"], reverse=True)
    top_tracks = scored_tracks[:max_tracks]

    print(f"[ML Backend] Keeping top {len(top_tracks)} of {len(scored_tracks)} valid tracks (after filtering)")
    for t in top_tracks[:5]:
        print(f"  Track {t['track_id']}: {t['num_detections']} detections, size={t['avg_size']:.1f}, y={t['avg_y']:.1f}%")

    results = []
    for track_data in top_tracks:
        track_id = track_data["track_id"]
        frames = track_data["frames"]

        rect_id = f"track_{track_id}"
        frames_sorted = sorted(frames, key=lambda f: f["frame"])
        avg_confidence = sum(f["confidence"] for f in frames_sorted) / len(frames_sorted)

        # Build the sequence with all frame positions INCLUDING time
        sequence = []
        for f in frames_sorted:
            frame_time = f["frame"] / fps if fps > 0 else 0
            sequence.append({
                "x": f["x"],
                "y": f["y"],
                "width": f["width"],
                "height": f["height"],
                "frame": f["frame"],
                "time": round(frame_time, 3),  # Required by Label Studio
                "enabled": True,
                "rotation": 0
            })

        # Determine label - use jersey number if detected
        jersey_num = track_jerseys.get(track_id)
        if jersey_num:
            label = f"#{jersey_num}"
        else:
            label = "Player"

        # Create ONE videorectangle for this track with proper Label Studio format
        rect_result = {
            "id": rect_id,
            "type": "videorectangle",
            "from_name": "box",
            "to_name": "video",
            "value": {
                "framesCount": total_frames,
                "duration": round(duration, 2),
                "sequence": sequence,
                "labels": [label]
            },
            "score": avg_confidence
        }
        results.append(rect_result)

    print(f"[ML Backend] Created {len(results)} tracked annotations (duration={duration:.1f}s, frames={total_frames})")

    return {
        "model_version": "yolov8x-jersey-v3",
        "result": results
    }


def format_predictions(detections: List[Dict]) -> Dict[str, Any]:
    """Format detections as Label Studio predictions with jersey numbers."""
    import uuid

    results = []

    for det in detections:
        rect_id = str(uuid.uuid4())[:8]

        # Add the video rectangle
        rect_result = {
            "id": rect_id,
            "type": "videorectangle",
            "from_name": "box",
            "to_name": "video",
            "value": {
                "sequence": [{
                    "x": det["x"],
                    "y": det["y"],
                    "width": det["width"],
                    "height": det["height"],
                    "frame": det["frame"],
                    "enabled": True,
                    "rotation": 0
                }],
                "labels": [det["label"]]
            },
            "score": det["confidence"]
        }
        results.append(rect_result)

        # Add linked jersey number text if OCR detected one
        if det.get("jersey_number"):
            jersey_result = {
                "id": str(uuid.uuid4())[:8],
                "type": "textarea",
                "from_name": "jerseyNumber",
                "to_name": "video",
                "value": {
                    "text": [det["jersey_number"]]
                },
                "parentID": rect_id
            }
            results.append(jersey_result)

    jersey_count = sum(1 for d in detections if d.get("jersey_number"))
    print(f"[ML Backend] Formatted {len(detections)} detections, {jersey_count} with jersey numbers")

    return {
        "model_version": "yolov8x-v1",
        "result": results
    }


def format_predictions_tracked(tracks: Dict[int, List[Dict]], max_tracks: int = 15) -> Dict[str, Any]:
    """Format tracked detections as Label Studio predictions.

    Each track becomes ONE videorectangle with a multi-frame sequence.
    Filters to only the most persistent tracks (players/refs/ball).

    Args:
        tracks: Dict mapping track_id -> list of frame detections
        max_tracks: Maximum number of tracks to output (default 15 for football)

    Returns:
        Label Studio prediction format
    """
    if not tracks:
        return {"model_version": "yolov8x-bytetrack-v2", "result": []}

    # Calculate total frames in video (for filtering)
    all_frame_nums = set()
    for frames in tracks.values():
        for f in frames:
            all_frame_nums.add(f["frame"])
    total_sampled_frames = len(all_frame_nums)

    print(f"[ML Backend] {len(tracks)} raw tracks across {total_sampled_frames} sampled frames")

    # Score tracks by persistence and quality
    # Good tracks: appear in many frames, high confidence, large bounding boxes (not distant crowd)
    scored_tracks = []
    for track_id, frames in tracks.items():
        if len(frames) < 2:
            # Skip tracks with only 1 detection (noise)
            continue

        # Calculate metrics
        num_detections = len(frames)
        avg_confidence = sum(f["confidence"] for f in frames) / len(frames)
        avg_size = sum(f["width"] * f["height"] for f in frames) / len(frames)  # Larger = closer to camera

        # Score: prioritize tracks by number of detections (most important for short clips)
        # then confidence, then size
        score = (num_detections * 10) + (avg_confidence * 5) + (avg_size * 0.1)

        scored_tracks.append({
            "track_id": track_id,
            "frames": frames,
            "score": score,
            "num_detections": num_detections,
            "avg_confidence": avg_confidence,
            "avg_size": avg_size,
        })

    # Sort by score and keep top N
    scored_tracks.sort(key=lambda t: t["score"], reverse=True)
    top_tracks = scored_tracks[:max_tracks]

    print(f"[ML Backend] Filtered to top {len(top_tracks)} tracks (of {len(scored_tracks)} valid)")
    for i, t in enumerate(top_tracks[:5]):  # Log top 5
        print(f"  Track {t['track_id']}: detections={t['num_detections']}, conf={t['avg_confidence']:.2f}, size={t['avg_size']:.1f}")

    # Build Label Studio results
    results = []
    for track_data in top_tracks:
        track_id = track_data["track_id"]
        frames = track_data["frames"]

        rect_id = f"track_{track_id}"
        frames_sorted = sorted(frames, key=lambda f: f["frame"])
        avg_confidence = track_data["avg_confidence"]

        # Build the sequence with all frame positions
        sequence = []
        for f in frames_sorted:
            sequence.append({
                "x": f["x"],
                "y": f["y"],
                "width": f["width"],
                "height": f["height"],
                "frame": f["frame"],
                "enabled": True,
                "rotation": 0
            })

        # Create ONE videorectangle for this player
        rect_result = {
            "id": rect_id,
            "type": "videorectangle",
            "from_name": "box",
            "to_name": "video",
            "value": {
                "sequence": sequence,
                "labels": ["Player"]
            },
            "score": avg_confidence
        }
        results.append(rect_result)

    print(f"[ML Backend] Created {len(results)} tracked player annotations")

    return {
        "model_version": "yolov8x-bytetrack-v2",
        "result": results
    }


# FastAPI app for Label Studio ML Backend protocol
# Everything runs in ONE container with models loaded at startup

@app.function(
    image=ml_backend_image,
    gpu="A10G",
    timeout=600,
    secrets=[Secret.from_name("ai-scout-secrets")],
    scaledown_window=300,
)
@modal.asgi_app()
def label_studio_backend():
    """ASGI app serving Label Studio ML Backend protocol.

    All ML inference happens in THIS container - no remote calls.
    Models are loaded once when the container starts.
    """
    from fastapi import FastAPI, Request
    from pydantic import BaseModel

    # Load models at container startup
    print("[ML Backend] Container starting - loading models...")
    yolo = _load_models()
    print("[ML Backend] Models loaded - ready for requests!")

    web_app = FastAPI(title="AI Scout ML Backend")

    class SetupRequest(BaseModel):
        """Label Studio setup request format."""
        project: str
        schema: str
        hostname: str
        access_token: str

    @web_app.get("/health")
    async def health():
        """Health check endpoint."""
        return {
            "status": "UP",
            "models_loaded": _yolo_model is not None
        }

    @web_app.post("/setup")
    async def setup(request: SetupRequest):
        """Label Studio calls this to verify the ML backend is compatible."""
        return {"model_version": "yolov8x-v1"}

    @web_app.post("/predict")
    async def predict(request: Request):
        """
        Label Studio calls this endpoint to get predictions.

        The request contains tasks with video URLs.
        We run YOLO detection and return pre-annotations.

        ALL processing happens in THIS container (no remote calls).
        """
        body = await request.json()
        tasks = body.get("tasks", [])

        if not tasks:
            return {"results": []}

        results = []
        for task in tasks:
            video_url = task.get("data", {}).get("video")

            if not video_url:
                results.append({"result": [], "model_version": "yolov8x-v1"})
                continue

            try:
                # Run prediction with BoT-SORT tracking
                # Process ALL frames, save keyframes every 10 frames
                prediction = predict_video(yolo, video_url, keyframe_rate=10)
                results.append(prediction)
            except Exception as e:
                print(f"[ML Backend] Error predicting task: {e}")
                import traceback
                traceback.print_exc()
                results.append({"result": [], "model_version": "yolov8x-v1", "error": str(e)})

        return {"results": results}

    @web_app.post("/webhook")
    async def webhook(request: Request):
        """Receive annotation updates from Label Studio."""
        body = await request.json()
        action = body.get("action")
        print(f"[ML Backend] Received webhook: {action}")
        return {"status": "received"}

    return web_app


if __name__ == "__main__":
    print("AI Scout ML Backend")
    print("Deploy with: modal deploy ml_backend.py")
    print("Test locally with: modal serve ml_backend.py")
    print("")
    print("Endpoints:")
    print("  GET  /health  - Health check")
    print("  POST /setup   - Label Studio setup verification")
    print("  POST /predict - Get predictions for tasks")
    print("  POST /webhook - Receive annotation webhooks")
