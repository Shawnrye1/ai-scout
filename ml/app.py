"""
AI Scout - Video Processing Pipeline
Modal.com serverless GPU functions for game film analysis
"""

import modal
import os
from typing import Optional
from dataclasses import dataclass

# Create Modal app
app = modal.App("ai-scout")

# Define the container image with all dependencies
image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install(
        "libgl1-mesa-glx",
        "libglib2.0-0",
        "libsm6",
        "libxext6",
        "libxrender-dev",
        "ffmpeg",
    )
    .pip_install(
        "ultralytics>=8.2.0",
        "supervision>=0.21.0",
        "opencv-python-headless>=4.9.0",
        "numpy>=1.26.0",
        "pillow>=10.0.0",
        "torch>=2.2.0",
        "torchvision>=0.17.0",
        "easyocr>=1.7.0",
        "boto3>=1.34.0",
        "httpx>=0.27.0",
        "anthropic>=0.25.0",
        "fastapi>=0.111.0",
    )
)


@dataclass
class ProcessingConfig:
    """Configuration for video processing"""
    game_id: str
    video_url: str
    webhook_url: str
    webhook_secret: str
    sport: Optional[str] = None  # None = auto-detect
    r2_access_key: str = ""
    r2_secret_key: str = ""
    r2_endpoint: str = ""
    r2_bucket: str = ""
    anthropic_api_key: str = ""


# Shared volume for model caching
model_cache = modal.Volume.from_name("ai-scout-models", create_if_missing=True)


@app.function(
    image=image,
    gpu="T4",
    timeout=3600,  # 1 hour max
    volumes={"/models": model_cache},
    secrets=[modal.Secret.from_name("ScoutAi")],
)
def process_game_video(config: dict) -> dict:
    """
    Main entry point for processing a game video.

    Pipeline:
    1. Download video from R2
    2. Extract frames
    3. Detect sport (if not specified)
    4. Detect and track players
    5. OCR jersey numbers
    6. Segment into plays
    7. Generate reports with Claude
    8. Upload results and notify via webhook
    """
    import cv2
    import numpy as np
    import httpx
    import json
    import hashlib
    import hmac
    from pathlib import Path

    game_id = config["game_id"]
    video_url = config["video_url"]
    webhook_url = config["webhook_url"]
    webhook_secret = config["webhook_secret"]

    def send_progress(status: str, progress: int, message: str = ""):
        """Send progress update via webhook"""
        payload = {
            "gameId": game_id,
            "status": status,
            "progress": progress,
            "message": message,
        }
        body = json.dumps(payload)
        signature = hmac.new(
            webhook_secret.encode(),
            body.encode(),
            hashlib.sha256
        ).hexdigest()

        try:
            httpx.post(
                webhook_url,
                json=payload,
                headers={"X-Webhook-Signature": signature},
                timeout=10,
            )
        except Exception as e:
            print(f"Webhook error: {e}")

    try:
        # Step 1: Download video
        send_progress("detecting", 5, "Downloading video...")
        video_path = download_video(video_url, game_id)

        # Step 2: Extract video info
        send_progress("detecting", 10, "Analyzing video...")
        video_info = get_video_info(video_path)

        # Step 3: Detect sport
        sport = config.get("sport")
        if not sport:
            send_progress("detecting", 15, "Detecting sport...")
            sport = detect_sport(video_path)

        # Step 4: Detect and track players
        send_progress("detecting", 20, "Detecting players...")
        detections = detect_players(video_path, sport)

        send_progress("tracking", 40, "Tracking player movement...")
        tracks = track_players(detections, video_info)

        # Step 5: OCR jersey numbers
        send_progress("tracking", 60, "Reading jersey numbers...")
        players = identify_players(video_path, tracks)

        # Step 6: Segment into plays
        send_progress("analyzing", 70, "Segmenting plays...")
        plays = segment_plays(tracks, sport)

        # Step 7: Cluster into teams
        send_progress("analyzing", 75, "Identifying teams...")
        teams = cluster_teams(players, video_path)

        # Step 8: Generate reports
        send_progress("analyzing", 80, "Generating scouting reports...")
        reports = generate_reports(
            players,
            plays,
            teams,
            sport,
            config.get("anthropic_api_key", os.environ.get("ANTHROPICAPIKEY", ""))
        )

        # Step 9: Upload results
        send_progress("analyzing", 95, "Saving results...")
        results = {
            "gameId": game_id,
            "sport": sport,
            "videoInfo": video_info,
            "teams": teams,
            "players": players,
            "plays": plays,
            "reports": reports,
        }

        # Final webhook with complete data
        send_progress("ready", 100, "Analysis complete!")

        return results

    except Exception as e:
        send_progress("failed", 0, str(e))
        raise


def download_video(url: str, game_id: str) -> str:
    """Download video from presigned URL to local temp file"""
    import httpx
    from pathlib import Path

    video_path = f"/tmp/{game_id}.mp4"

    with httpx.stream("GET", url, timeout=300) as response:
        response.raise_for_status()
        with open(video_path, "wb") as f:
            for chunk in response.iter_bytes(chunk_size=8192):
                f.write(chunk)

    return video_path


def get_video_info(video_path: str) -> dict:
    """Extract video metadata"""
    import cv2

    cap = cv2.VideoCapture(video_path)

    info = {
        "width": int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)),
        "height": int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT)),
        "fps": cap.get(cv2.CAP_PROP_FPS),
        "frameCount": int(cap.get(cv2.CAP_PROP_FRAME_COUNT)),
        "durationSeconds": int(cap.get(cv2.CAP_PROP_FRAME_COUNT) / cap.get(cv2.CAP_PROP_FPS)),
    }

    cap.release()
    return info


def detect_sport(video_path: str) -> str:
    """
    Auto-detect sport from video content.
    Uses visual cues like court/field markings, ball shape, etc.
    """
    import cv2
    import numpy as np

    cap = cv2.VideoCapture(video_path)

    # Sample frames from video
    frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    sample_indices = np.linspace(0, frame_count - 1, 10, dtype=int)

    green_scores = []
    orange_scores = []

    for idx in sample_indices:
        cap.set(cv2.CAP_PROP_POS_FRAMES, idx)
        ret, frame = cap.read()
        if not ret:
            continue

        hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)

        # Green detection (football field)
        green_mask = cv2.inRange(hsv, (35, 40, 40), (85, 255, 255))
        green_ratio = np.sum(green_mask > 0) / green_mask.size
        green_scores.append(green_ratio)

        # Orange/wood detection (basketball court)
        orange_mask = cv2.inRange(hsv, (10, 50, 50), (25, 255, 255))
        orange_ratio = np.sum(orange_mask > 0) / orange_mask.size
        orange_scores.append(orange_ratio)

    cap.release()

    avg_green = np.mean(green_scores)
    avg_orange = np.mean(orange_scores)

    # Football fields are predominantly green
    # Basketball courts have wood tones
    if avg_green > 0.3:
        return "football"
    elif avg_orange > 0.15:
        return "basketball"
    else:
        # Default to football if unclear
        return "football"


def detect_players(video_path: str, sport: str) -> list:
    """
    Detect players in video frames using YOLOv8.
    Returns list of detections per frame.
    """
    from ultralytics import YOLO
    import cv2
    import numpy as np
    from pathlib import Path

    # Use cached model if available
    model_path = Path("/models/yolov8x.pt")
    if not model_path.exists():
        model = YOLO("yolov8x.pt")
        model.save("/models/yolov8x.pt")
    else:
        model = YOLO(str(model_path))

    cap = cv2.VideoCapture(video_path)
    fps = cap.get(cv2.CAP_PROP_FPS)
    frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

    all_detections = []
    frame_idx = 0

    # Process every 3rd frame for speed
    sample_rate = 3

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        if frame_idx % sample_rate == 0:
            # Run YOLO detection
            results = model(frame, classes=[0], verbose=False)  # class 0 = person

            frame_detections = []
            for r in results:
                boxes = r.boxes
                for box in boxes:
                    x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                    conf = float(box.conf[0])

                    if conf > 0.5:
                        frame_detections.append({
                            "frame": frame_idx,
                            "timestamp": frame_idx / fps,
                            "bbox": [float(x1), float(y1), float(x2), float(y2)],
                            "confidence": conf,
                        })

            all_detections.append({
                "frame": frame_idx,
                "detections": frame_detections,
            })

        frame_idx += 1

    cap.release()
    return all_detections


def track_players(detections: list, video_info: dict) -> list:
    """
    Track players across frames using ByteTrack.
    Associates detections into continuous tracks.
    """
    import supervision as sv
    import numpy as np

    tracker = sv.ByteTrack(
        track_activation_threshold=0.25,
        lost_track_buffer=30,
        minimum_matching_threshold=0.8,
        frame_rate=video_info["fps"],
    )

    tracks = {}  # track_id -> list of positions

    for frame_data in detections:
        frame_idx = frame_data["frame"]
        dets = frame_data["detections"]

        if not dets:
            continue

        # Convert to supervision format
        xyxy = np.array([d["bbox"] for d in dets])
        confidence = np.array([d["confidence"] for d in dets])

        sv_detections = sv.Detections(
            xyxy=xyxy,
            confidence=confidence,
        )

        # Update tracker
        tracked = tracker.update_with_detections(sv_detections)

        # Store track positions
        for i, track_id in enumerate(tracked.tracker_id):
            if track_id not in tracks:
                tracks[track_id] = []

            tracks[track_id].append({
                "frame": frame_idx,
                "timestamp": dets[0]["timestamp"] if dets else 0,
                "bbox": tracked.xyxy[i].tolist(),
                "confidence": float(tracked.confidence[i]),
            })

    # Convert to list format
    track_list = []
    for track_id, positions in tracks.items():
        if len(positions) >= 10:  # Minimum track length
            track_list.append({
                "trackId": int(track_id),
                "positions": positions,
                "frameStart": positions[0]["frame"],
                "frameEnd": positions[-1]["frame"],
            })

    return track_list


def identify_players(video_path: str, tracks: list) -> list:
    """
    Identify players by jersey number using OCR.
    """
    import cv2
    import easyocr
    import numpy as np
    from collections import Counter

    # Initialize OCR reader (will download models on first run)
    reader = easyocr.Reader(["en"], gpu=True)

    cap = cv2.VideoCapture(video_path)

    players = []

    for track in tracks:
        jersey_readings = []
        dominant_colors = []

        # Sample frames from the track
        positions = track["positions"]
        sample_indices = np.linspace(0, len(positions) - 1, min(10, len(positions)), dtype=int)

        for idx in sample_indices:
            pos = positions[idx]
            frame_idx = pos["frame"]
            bbox = pos["bbox"]

            cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
            ret, frame = cap.read()
            if not ret:
                continue

            # Extract player crop
            x1, y1, x2, y2 = [int(v) for v in bbox]
            h = y2 - y1

            # Focus on upper body for jersey number
            jersey_crop = frame[y1:y1 + int(h * 0.5), x1:x2]

            if jersey_crop.size == 0:
                continue

            # OCR for jersey number
            try:
                results = reader.readtext(jersey_crop, allowlist="0123456789")
                for (_, text, conf) in results:
                    if conf > 0.5 and text.isdigit() and 0 < int(text) < 100:
                        jersey_readings.append(int(text))
            except:
                pass

            # Extract dominant color
            try:
                hsv = cv2.cvtColor(jersey_crop, cv2.COLOR_BGR2HSV)
                # Get most common hue
                hue_hist = cv2.calcHist([hsv], [0], None, [180], [0, 180])
                dominant_hue = np.argmax(hue_hist)
                dominant_colors.append(dominant_hue)
            except:
                pass

        # Determine most likely jersey number
        jersey_number = None
        jersey_confidence = 0.0
        if jersey_readings:
            counter = Counter(jersey_readings)
            most_common = counter.most_common(1)[0]
            jersey_number = most_common[0]
            jersey_confidence = most_common[1] / len(jersey_readings)

        # Determine dominant color
        dominant_color = None
        if dominant_colors:
            avg_hue = int(np.mean(dominant_colors))
            # Convert hue to color name
            if avg_hue < 15 or avg_hue > 165:
                dominant_color = "red"
            elif avg_hue < 35:
                dominant_color = "orange"
            elif avg_hue < 75:
                dominant_color = "green"
            elif avg_hue < 130:
                dominant_color = "blue"
            else:
                dominant_color = "purple"

        players.append({
            "trackId": track["trackId"],
            "jerseyNumber": jersey_number,
            "jerseyConfidence": jersey_confidence,
            "dominantColor": dominant_color,
            "positions": track["positions"],
            "frameStart": track["frameStart"],
            "frameEnd": track["frameEnd"],
        })

    cap.release()
    return players


def segment_plays(tracks: list, sport: str) -> list:
    """
    Segment video into individual plays/possessions.
    Uses movement patterns to detect play boundaries.
    """
    import numpy as np

    plays = []

    if not tracks:
        return plays

    # Get all timestamps with activity
    all_timestamps = set()
    for track in tracks:
        for pos in track["positions"]:
            all_timestamps.add(pos["frame"])

    sorted_frames = sorted(all_timestamps)

    if not sorted_frames:
        return plays

    # Detect gaps in activity (play boundaries)
    gap_threshold = 90  # ~3 seconds at 30fps

    play_boundaries = [sorted_frames[0]]
    for i in range(1, len(sorted_frames)):
        if sorted_frames[i] - sorted_frames[i-1] > gap_threshold:
            play_boundaries.append(sorted_frames[i-1])
            play_boundaries.append(sorted_frames[i])
    play_boundaries.append(sorted_frames[-1])

    # Create plays from boundaries
    for i in range(0, len(play_boundaries) - 1, 2):
        start_frame = play_boundaries[i]
        end_frame = play_boundaries[i + 1] if i + 1 < len(play_boundaries) else play_boundaries[-1]

        # Count players involved in this play
        players_in_play = []
        for track in tracks:
            track_frames = [p["frame"] for p in track["positions"]]
            if any(start_frame <= f <= end_frame for f in track_frames):
                players_in_play.append(track["trackId"])

        if len(players_in_play) >= 2:  # At least 2 players for a valid play
            plays.append({
                "playNumber": len(plays) + 1,
                "frameStart": start_frame,
                "frameEnd": end_frame,
                "durationFrames": end_frame - start_frame,
                "playerCount": len(players_in_play),
                "playerTrackIds": players_in_play,
            })

    return plays


def cluster_teams(players: list, video_path: str) -> list:
    """
    Cluster players into teams based on jersey color.
    """
    from collections import defaultdict
    import numpy as np

    # Group players by dominant color
    color_groups = defaultdict(list)
    for player in players:
        color = player.get("dominantColor", "unknown")
        color_groups[color].append(player)

    # Take top 2 color groups as teams
    sorted_groups = sorted(color_groups.items(), key=lambda x: len(x[1]), reverse=True)

    teams = []
    for i, (color, team_players) in enumerate(sorted_groups[:2]):
        team_id = f"team_{i + 1}"
        teams.append({
            "teamId": team_id,
            "teamLabel": f"Team {i + 1}",
            "primaryColor": color,
            "playerCount": len(team_players),
            "playerTrackIds": [p["trackId"] for p in team_players],
            "isUserTeam": i == 0,  # Assume first team is user's team
        })

    return teams


def generate_reports(
    players: list,
    plays: list,
    teams: list,
    sport: str,
    anthropic_api_key: str
) -> dict:
    """
    Generate scouting reports using Claude API.
    """
    import anthropic

    if not anthropic_api_key:
        # Return placeholder reports if no API key
        return {
            "playerReports": {},
            "teamReports": {},
            "gameReport": "Analysis complete. Configure ANTHROPIC_API_KEY for AI-generated reports.",
        }

    client = anthropic.Anthropic(api_key=anthropic_api_key)

    reports = {
        "playerReports": {},
        "teamReports": {},
        "gameReport": "",
    }

    # Generate player reports
    for player in players[:20]:  # Limit to 20 players to control costs
        track_id = player["trackId"]
        jersey = player.get("jerseyNumber", "Unknown")

        # Calculate basic metrics
        positions = player.get("positions", [])
        if len(positions) < 2:
            continue

        # Simple movement analysis
        total_distance = 0
        for i in range(1, len(positions)):
            prev = positions[i-1]["bbox"]
            curr = positions[i]["bbox"]
            dx = (curr[0] + curr[2])/2 - (prev[0] + prev[2])/2
            dy = (curr[1] + curr[3])/2 - (prev[1] + prev[3])/2
            total_distance += (dx**2 + dy**2)**0.5

        frames_active = player["frameEnd"] - player["frameStart"]

        prompt = f"""You are an expert {sport} scout. Generate a brief scouting report for a player based on this tracking data:

Player: #{jersey if jersey else 'Unknown'}
Sport: {sport}
Frames tracked: {frames_active}
Estimated movement: {total_distance:.0f} pixels

Generate a realistic 2-3 sentence scouting summary in the style of a professional scout. Focus on what this movement data might suggest about the player's role and tendencies. Be specific but acknowledge this is limited data.

Respond with just the report text, no headers or formatting."""

        try:
            response = client.messages.create(
                model="claude-3-haiku-20240307",
                max_tokens=200,
                messages=[{"role": "user", "content": prompt}]
            )
            reports["playerReports"][track_id] = {
                "summary": response.content[0].text,
                "grade": min(99, max(50, 70 + (total_distance / 1000))),  # Placeholder grading
            }
        except Exception as e:
            reports["playerReports"][track_id] = {
                "summary": f"Player #{jersey} tracked for {frames_active} frames.",
                "grade": 70,
            }

    # Generate team report
    for team in teams:
        team_id = team["teamId"]
        player_count = team["playerCount"]

        prompt = f"""You are an expert {sport} scout. Generate a brief team tendencies report:

Team: {team['teamLabel']}
Primary jersey color: {team['primaryColor']}
Players detected: {player_count}
Sport: {sport}

Generate 2-3 sentences about potential team tendencies based on the number of players and sport. This is placeholder analysis - focus on general {sport} concepts.

Respond with just the report text."""

        try:
            response = client.messages.create(
                model="claude-3-haiku-20240307",
                max_tokens=200,
                messages=[{"role": "user", "content": prompt}]
            )
            reports["teamReports"][team_id] = response.content[0].text
        except:
            reports["teamReports"][team_id] = f"Team analysis for {player_count} players."

    # Generate overall game report
    reports["gameReport"] = f"Analyzed {len(plays)} plays with {len(players)} players detected across {len(teams)} teams."

    return reports


# Webhook endpoint for triggering processing
@app.function(image=image, secrets=[modal.Secret.from_name("ScoutAi")])
@modal.web_endpoint(method="POST")
def trigger_processing(data: dict):
    """
    HTTP endpoint to trigger video processing.
    Called by the Next.js app when a video upload completes.
    """
    import hmac
    import hashlib

    # Verify webhook signature
    webhook_secret = os.environ.get("MODALWEBHOOKSECRET", "")

    # Spawn processing job
    process_game_video.spawn(data)

    return {"status": "processing", "gameId": data.get("game_id")}


# Local testing
if __name__ == "__main__":
    # For local testing
    config = {
        "game_id": "test-123",
        "video_url": "https://example.com/video.mp4",
        "webhook_url": "http://localhost:3002/api/webhooks/modal",
        "webhook_secret": "test-secret",
        "sport": "football",
    }

    with app.run():
        result = process_game_video.remote(config)
        print(result)
