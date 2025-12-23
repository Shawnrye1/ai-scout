"""
AI Scout - YOLOv8 Fine-tuning Pipeline
Runs on Modal.com with A10G GPU

This module handles:
1. Downloading player annotations from the Next.js API
2. Converting Label Studio format to YOLO format
3. Fine-tuning YOLOv8 on custom player detection data
4. Computing validation metrics (mAP, precision, recall, F1)
5. Uploading trained model to R2
6. Posting results back via webhook
"""

import modal
import os
import json
import shutil
import tempfile
import hashlib
import hmac
from pathlib import Path
from datetime import datetime
import requests

# Modal app setup
app = modal.App("ai-scout-training")

# Container image with all dependencies
training_image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("libgl1-mesa-glx", "libglib2.0-0", "wget", "curl")
    .pip_install(
        "ultralytics>=8.0.200",
        "opencv-python-headless>=4.8.0",
        "numpy>=1.26.0",
        "pillow>=10.0.0",
        "requests>=2.31.0",
        "pyyaml>=6.0",
        "boto3>=1.34.0",  # For R2 upload
        "fastapi",  # Required for Modal web endpoints
    )
)

# Volume for caching models and datasets
training_volume = modal.Volume.from_name("ai-scout-training-data", create_if_missing=True)


@app.function(
    image=training_image,
    gpu="A10G",
    timeout=7200,  # 2 hours max
    volumes={"/data": training_volume},
    secrets=[modal.Secret.from_name("ai-scout-secrets")],
)
def train_player_detection(
    app_url: str,
    training_run_id: str,
    epochs: int = 50,
    batch_size: int = 16,
    base_model: str = "yolov8m.pt",
):
    """
    Fine-tune YOLOv8 for player detection using human-annotated data.

    Args:
        app_url: Base URL of the Next.js app (for API calls and webhooks)
        training_run_id: UUID of the training run in the database
        epochs: Number of training epochs (default 50)
        batch_size: Training batch size (default 16)
        base_model: Pretrained model to fine-tune (default yolov8m.pt)

    Returns:
        dict with training results and metrics
    """
    from ultralytics import YOLO
    import yaml

    webhook_secret = os.environ.get("MODAL_WEBHOOK_SECRET", "")
    r2_access_key = os.environ.get("CLOUDFLARE_R2_ACCESS_KEY", "")
    r2_secret_key = os.environ.get("CLOUDFLARE_R2_SECRET_KEY", "")
    r2_endpoint = os.environ.get("CLOUDFLARE_R2_ENDPOINT", "")
    r2_bucket = os.environ.get("CLOUDFLARE_R2_BUCKET", "aiscoutvideos")

    # Create working directory
    work_dir = Path(tempfile.mkdtemp())
    dataset_dir = work_dir / "dataset"
    dataset_dir.mkdir(parents=True)
    (dataset_dir / "images" / "train").mkdir(parents=True)
    (dataset_dir / "images" / "val").mkdir(parents=True)
    (dataset_dir / "labels" / "train").mkdir(parents=True)
    (dataset_dir / "labels" / "val").mkdir(parents=True)

    try:
        # ===== STEP 1: Download annotations from Next.js API =====
        send_progress(app_url, training_run_id, webhook_secret, "downloading", 5)

        annotations_url = f"{app_url}/api/admin/training/annotations"
        response = requests.get(annotations_url, timeout=60)
        response.raise_for_status()
        data = response.json()

        annotations = data.get("annotations", [])
        if len(annotations) < 10:
            raise ValueError(f"Insufficient annotations: {len(annotations)} (minimum 10 required)")

        print(f"Downloaded {len(annotations)} annotations")

        # ===== STEP 2: Convert to YOLO format =====
        send_progress(app_url, training_run_id, webhook_secret, "converting", 10)

        # Split 80/20 train/val
        split_idx = int(len(annotations) * 0.8)
        train_annotations = annotations[:split_idx]
        val_annotations = annotations[split_idx:]

        print(f"Train: {len(train_annotations)}, Val: {len(val_annotations)}")

        # Create cache directory for videos
        video_cache_dir = work_dir / "video_cache"
        video_cache_dir.mkdir(exist_ok=True)

        # Process training annotations
        for i, ann in enumerate(train_annotations):
            process_annotation(
                ann,
                dataset_dir / "images" / "train",
                dataset_dir / "labels" / "train",
                i,
                cache_dir=video_cache_dir
            )

        # Process validation annotations
        for i, ann in enumerate(val_annotations):
            process_annotation(
                ann,
                dataset_dir / "images" / "val",
                dataset_dir / "labels" / "val",
                i + len(train_annotations),  # Continue numbering
                cache_dir=video_cache_dir
            )

        # Create data.yaml
        data_yaml = {
            "path": str(dataset_dir),
            "train": "images/train",
            "val": "images/val",
            "nc": 2,  # 2 classes: player, ball
            "names": {
                0: "player",
                1: "ball",
            }
        }

        data_yaml_path = dataset_dir / "data.yaml"
        with open(data_yaml_path, "w") as f:
            yaml.dump(data_yaml, f)

        print(f"Dataset prepared at {dataset_dir}")

        # ===== STEP 3: Train YOLOv8 =====
        send_progress(app_url, training_run_id, webhook_secret, "training", 20)

        # Load pretrained model
        model = YOLO(base_model)

        # Train with custom data
        start_time = datetime.now()
        results = model.train(
            data=str(data_yaml_path),
            epochs=epochs,
            batch=batch_size,
            imgsz=640,
            lr0=0.001,  # Lower learning rate for fine-tuning
            lrf=0.01,
            patience=20,  # Early stopping
            device=0,  # GPU
            project=str(work_dir / "runs"),
            name="player_detection",
            exist_ok=True,
            verbose=True,
        )

        training_time = (datetime.now() - start_time).total_seconds()
        print(f"Training completed in {training_time:.0f} seconds")

        # ===== STEP 4: Validate and get metrics =====
        send_progress(app_url, training_run_id, webhook_secret, "validating", 80)

        # Run validation
        metrics = model.val()

        # Extract metrics
        model_metrics = {
            "mAP50": float(metrics.box.map50) * 100,  # Convert to percentage
            "mAP5095": float(metrics.box.map) * 100,
            "precision": float(metrics.box.mp) * 100,
            "recall": float(metrics.box.mr) * 100,
            "f1Score": 2 * (float(metrics.box.mp) * float(metrics.box.mr)) / (float(metrics.box.mp) + float(metrics.box.mr) + 1e-6) * 100,
        }

        # Get per-class metrics if available
        class_metrics = {}
        if hasattr(metrics.box, 'ap_class_index'):
            for i, cls_idx in enumerate(metrics.box.ap_class_index):
                class_name = data_yaml["names"].get(int(cls_idx), f"class_{cls_idx}")
                class_metrics[class_name] = {
                    "precision": float(metrics.box.p[i]) * 100 if i < len(metrics.box.p) else 0,
                    "recall": float(metrics.box.r[i]) * 100 if i < len(metrics.box.r) else 0,
                    "ap50": float(metrics.box.ap50[i]) * 100 if i < len(metrics.box.ap50) else 0,
                }

        model_metrics["classMetrics"] = class_metrics

        print(f"Metrics: mAP50={model_metrics['mAP50']:.1f}%, Precision={model_metrics['precision']:.1f}%, Recall={model_metrics['recall']:.1f}%")

        # ===== STEP 5: Upload model to R2 =====
        send_progress(app_url, training_run_id, webhook_secret, "uploading", 90)

        # Find the best model weights
        best_model_path = work_dir / "runs" / "player_detection" / "weights" / "best.pt"
        if not best_model_path.exists():
            best_model_path = work_dir / "runs" / "player_detection" / "weights" / "last.pt"

        model_size = best_model_path.stat().st_size if best_model_path.exists() else 0

        # Generate version string
        version = f"v1.{len(annotations)}.{int(datetime.now().timestamp()) % 10000}"
        model_key = f"models/player_detection/{version}/best.pt"

        # Upload to R2 if credentials available
        model_url = None
        if r2_access_key and r2_secret_key and r2_endpoint:
            try:
                import boto3

                s3 = boto3.client(
                    "s3",
                    endpoint_url=r2_endpoint,
                    aws_access_key_id=r2_access_key,
                    aws_secret_access_key=r2_secret_key,
                )

                with open(best_model_path, "rb") as f:
                    s3.upload_fileobj(f, r2_bucket, model_key)

                model_url = f"{r2_endpoint}/{r2_bucket}/{model_key}"
                print(f"Model uploaded to R2: {model_key}")
            except Exception as e:
                print(f"Failed to upload to R2: {e}")
                model_url = None

        # ===== STEP 6: Send results to webhook =====
        result = {
            "success": True,
            "trainingRunId": training_run_id,
            "version": version,
            "trainingDataCount": len(annotations),
            "epochs": epochs,
            "batchSize": batch_size,
            "durationSeconds": int(training_time),
            "metrics": model_metrics,
            "modelPath": model_key if model_url else None,
            "modelSizeBytes": model_size,
        }

        send_completion(app_url, training_run_id, webhook_secret, result)

        return result

    except Exception as e:
        error_msg = str(e)
        print(f"Training failed: {error_msg}")

        # Send failure webhook
        send_failure(app_url, training_run_id, webhook_secret, error_msg)

        return {
            "success": False,
            "trainingRunId": training_run_id,
            "error": error_msg,
        }

    finally:
        # Cleanup
        shutil.rmtree(work_dir, ignore_errors=True)


# Cache for downloaded videos to avoid re-downloading
_video_cache: dict = {}


def get_frame_from_video(video_url: str, frame_number: int, cache_dir: Path) -> "np.ndarray | None":
    """Download video and extract specific frame."""
    import cv2
    import numpy as np

    global _video_cache

    # Check if video is already cached
    if video_url not in _video_cache:
        print(f"Downloading video: {video_url[:80]}...")
        try:
            response = requests.get(video_url, timeout=120, stream=True)
            response.raise_for_status()

            # Save video to cache directory
            video_hash = hashlib.md5(video_url.encode()).hexdigest()[:12]
            video_path = cache_dir / f"video_{video_hash}.mp4"

            with open(video_path, "wb") as f:
                for chunk in response.iter_content(chunk_size=8192):
                    f.write(chunk)

            _video_cache[video_url] = str(video_path)
            print(f"Video cached: {video_path}")
        except Exception as e:
            print(f"Failed to download video: {e}")
            return None

    # Extract frame
    video_path = _video_cache[video_url]
    cap = cv2.VideoCapture(video_path)

    try:
        cap.set(cv2.CAP_PROP_POS_FRAMES, frame_number)
        ret, frame = cap.read()

        if not ret:
            print(f"Failed to read frame {frame_number} from video")
            return None

        return frame
    finally:
        cap.release()


def process_annotation(annotation: dict, images_dir: Path, labels_dir: Path, idx: int, cache_dir: Path = None):
    """
    Convert a single annotation to YOLO format.

    Expected annotation format:
    {
        "imageUrl": "https://..." (optional),
        "videoUrl": "https://..." (optional),
        "frameNumber": 123 (required if videoUrl is used),
        "imageWidth": 1920,
        "imageHeight": 1080,
        "bboxes": [
            {"x": 100, "y": 200, "width": 50, "height": 100, "class": "player"},
            ...
        ]
    }
    """
    import cv2
    import numpy as np

    image_url = annotation.get("imageUrl") or annotation.get("image_url")
    video_url = annotation.get("videoUrl") or annotation.get("video_url")
    frame_number = annotation.get("frameNumber") or annotation.get("frame_number")
    image_width = annotation.get("imageWidth") or annotation.get("image_width", 1920)
    image_height = annotation.get("imageHeight") or annotation.get("image_height", 1080)
    bboxes = annotation.get("bboxes", [])

    if not bboxes:
        print(f"Skipping annotation {idx}: no bboxes")
        return

    # Get the image either from URL or by extracting from video
    img = None

    try:
        if image_url:
            # Download image directly
            response = requests.get(image_url, timeout=30)
            response.raise_for_status()
            img_array = np.frombuffer(response.content, np.uint8)
            img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
        elif video_url and frame_number is not None:
            # Extract frame from video
            if cache_dir is None:
                cache_dir = Path(tempfile.gettempdir()) / "video_cache"
                cache_dir.mkdir(exist_ok=True)
            img = get_frame_from_video(video_url, frame_number, cache_dir)
        else:
            print(f"Skipping annotation {idx}: no imageUrl or videoUrl+frameNumber")
            return

        if img is None:
            print(f"Failed to get image for annotation {idx}")
            return

        # Save image
        image_path = images_dir / f"frame_{idx:06d}.jpg"
        cv2.imwrite(str(image_path), img)

        # Get actual image dimensions
        actual_height, actual_width = img.shape[:2]

        # Convert bboxes to YOLO format and save labels
        label_path = labels_dir / f"frame_{idx:06d}.txt"
        with open(label_path, "w") as f:
            for bbox in bboxes:
                # Get class ID
                class_name = bbox.get("class", "player").lower()
                class_id = 0 if class_name == "player" else 1 if class_name == "ball" else 0

                # Get bbox coordinates (could be in different formats)
                x = bbox.get("x", 0)
                y = bbox.get("y", 0)
                w = bbox.get("width", bbox.get("w", 0))
                h = bbox.get("height", bbox.get("h", 0))

                # Determine coordinate format and normalize
                # Format 1: Percentages (0-100) - from Label Studio
                # Format 2: Normalized (0-1) - already ready
                # Format 3: Pixel coordinates - need to normalize

                if x > 1 or y > 1 or w > 1 or h > 1:
                    if x <= 100 and y <= 100 and w <= 100 and h <= 100:
                        # Percentages (0-100), convert to 0-1
                        x = x / 100
                        y = y / 100
                        w = w / 100
                        h = h / 100
                    else:
                        # Pixel coordinates - normalize using annotation dimensions
                        x = x / image_width
                        y = y / image_height
                        w = w / image_width
                        h = h / image_height

                # Convert from corner format to center format for YOLO
                x_center = x + w / 2
                y_center = y + h / 2

                # Clamp to valid range
                x_center = max(0, min(1, x_center))
                y_center = max(0, min(1, y_center))
                w = max(0, min(1, w))
                h = max(0, min(1, h))

                # Write YOLO format: class x_center y_center width height
                f.write(f"{class_id} {x_center:.6f} {y_center:.6f} {w:.6f} {h:.6f}\n")

        print(f"Processed annotation {idx}: {len(bboxes)} bboxes")

    except Exception as e:
        print(f"Error processing annotation {idx}: {e}")


def send_progress(app_url: str, training_run_id: str, secret: str, status: str, progress: int):
    """Send progress update to webhook."""
    try:
        webhook_url = f"{app_url}/api/webhooks/training"
        payload = {
            "type": "progress",
            "trainingRunId": training_run_id,
            "status": status,
            "progress": progress,
        }

        body = json.dumps(payload)
        signature = hmac.new(secret.encode(), body.encode(), hashlib.sha256).hexdigest()

        requests.post(
            webhook_url,
            json=payload,
            headers={"X-Webhook-Signature": signature},
            timeout=10,
        )
    except Exception as e:
        print(f"Failed to send progress: {e}")


def send_completion(app_url: str, training_run_id: str, secret: str, result: dict):
    """Send completion webhook with metrics."""
    try:
        webhook_url = f"{app_url}/api/webhooks/training"
        payload = {
            "type": "completed",
            "trainingRunId": training_run_id,
            **result,
        }

        body = json.dumps(payload)
        signature = hmac.new(secret.encode(), body.encode(), hashlib.sha256).hexdigest()

        response = requests.post(
            webhook_url,
            json=payload,
            headers={"X-Webhook-Signature": signature},
            timeout=30,
        )
        print(f"Completion webhook sent: {response.status_code}")
    except Exception as e:
        print(f"Failed to send completion: {e}")


def send_failure(app_url: str, training_run_id: str, secret: str, error: str):
    """Send failure webhook."""
    try:
        webhook_url = f"{app_url}/api/webhooks/training"
        payload = {
            "type": "failed",
            "trainingRunId": training_run_id,
            "error": error,
        }

        body = json.dumps(payload)
        signature = hmac.new(secret.encode(), body.encode(), hashlib.sha256).hexdigest()

        requests.post(
            webhook_url,
            json=payload,
            headers={"X-Webhook-Signature": signature},
            timeout=10,
        )
    except Exception as e:
        print(f"Failed to send failure webhook: {e}")


# Entry point for Modal web endpoint
@app.function(
    image=training_image,
    timeout=60,
)
@modal.fastapi_endpoint(method="POST")
def trigger_training(request: dict):
    """
    HTTP endpoint to trigger training.

    POST body:
    {
        "app_url": "https://your-app.ngrok.dev",
        "training_run_id": "uuid-here",
        "epochs": 50,
        "batch_size": 16
    }
    """
    app_url = request.get("app_url", "")
    training_run_id = request.get("training_run_id", "")
    epochs = request.get("epochs", 50)
    batch_size = request.get("batch_size", 16)
    base_model = request.get("base_model", "yolov8m.pt")

    if not app_url or not training_run_id:
        return {"error": "app_url and training_run_id required"}

    # Spawn training in background
    train_player_detection.spawn(
        app_url=app_url,
        training_run_id=training_run_id,
        epochs=epochs,
        batch_size=batch_size,
        base_model=base_model,
    )

    return {
        "success": True,
        "message": "Training started",
        "training_run_id": training_run_id,
    }


if __name__ == "__main__":
    # For local testing
    print("Deploy with: modal deploy train_yolo.py")
    print("Or serve locally with: modal serve train_yolo.py")
