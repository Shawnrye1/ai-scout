# AI Scout Annotation & Training Process

## Overview

This document outlines the complete process for annotating player data and training the YOLO model. The goal is to improve player detection accuracy by fine-tuning the model with human-corrected annotations.

---

## The Complete Pipeline

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           VIDEO UPLOAD                                       │
│  Coach uploads game film → Stored in Cloudflare R2                          │
│  videoKey: games/{gameId}/video.mp4                                         │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │                               │
                    ▼                               ▼
┌─────────────────────────────┐     ┌─────────────────────────────┐
│   PATH 1: MODAL SUCCEEDS    │     │   PATH 2: MODAL FAILS       │
│   Auto-detects plays        │     │   Or detects incorrectly    │
│   Webhook saves plays       │     │   Need manual annotation    │
│   Triggers clip extraction  │     │                             │
└─────────────────────────────┘     └─────────────────────────────┘
                    │                               │
                    │                               ▼
                    │               ┌─────────────────────────────┐
                    │               │   ANNOTATION UI             │
                    │               │   /admin/annotate/{gameId}  │
                    │               │   User marks play boundaries│
                    │               │   Press 'A' to mark start   │
                    │               │   Press 'A' again for end   │
                    │               └─────────────────────────────┘
                    │                               │
                    │                               ▼
                    │               ┌─────────────────────────────┐
                    │               │   "SEND TO REVIEW"          │
                    │               │   Triggers clip extraction  │
                    │               │   Same as Modal webhook     │
                    │               └─────────────────────────────┘
                    │                               │
                    └───────────────┬───────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CLIP EXTRACTION                                      │
│  POST /api/games/{gameId}/extract-clips                                     │
│  - Downloads full video from R2 ONCE                                        │
│  - Extracts each play as separate clip using ffmpeg                         │
│  - Uploads clips to R2: clips/{gameId}/{playId}.mp4                         │
│  - Frame 0 of clip = play start time                                        │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       CORRECTIONS QUEUE                                      │
│  /admin/corrections                                                         │
│  - Shows all plays that need player annotation                              │
│  - Each play has a pre-extracted clip ready                                 │
│  - Click "Analyze Video Clip" to send to Label Studio                       │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    "ANALYZE VIDEO CLIP" BUTTON                               │
│  POST /api/admin/labelstudio/send                                           │
│  - Gets pre-signed URL for the clip (already extracted)                     │
│  - Creates Label Studio task with clip URL                                  │
│  - Includes gameId, playId for tracking                                     │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         LABEL STUDIO                                         │
│  http://localhost:8080                                                      │
│  - Video player shows the CLIP (not full video)                             │
│  - Frame numbers are relative to clip (0 = start)                           │
│  - Draw bounding boxes around ALL visible players                           │
│  - Label every player in every frame you annotate                           │
│  - Click Submit when done                                                   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      ANNOTATION SYNC                                         │
│  Label Studio webhook or manual sync                                        │
│  - Saves annotations to corrections table                                   │
│  - correctionType = 'player_annotation'                                     │
│  - Stores bboxes with frame numbers (relative to clip)                      │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      ML MODELS PAGE                                          │
│  /admin/models                                                              │
│  - Shows annotation count (need 10+ minimum)                                │
│  - Click "Train" when ready                                                 │
│  - Triggers Modal training function                                         │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      TRAINING PIPELINE                                       │
│  Modal.com GPU (A10G)                                                       │
│  1. Fetch annotations from /api/admin/training/annotations                  │
│  2. Download CLIPS (not full videos) using pre-signed URLs                  │
│  3. Extract frames at annotated frame numbers                               │
│  4. Frame numbers MATCH because clips start at frame 0                      │
│  5. Convert bboxes to YOLO format                                           │
│  6. Fine-tune YOLOv8 model                                                  │
│  7. Compute metrics (mAP, precision, recall, F1)                            │
│  8. Upload trained model to R2                                              │
│  9. Post results via webhook                                                │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      METRICS DISPLAY                                         │
│  /admin/models                                                              │
│  - Shows REAL metrics from training                                         │
│  - Compares to previous training (delta arrows)                             │
│  - Can see if annotations are improving the model                           │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Key Locations

### Admin Pages

| Page | URL | Purpose |
|------|-----|---------|
| Annotation UI | `/admin/annotate/{gameId}` | Manually mark play boundaries |
| Corrections Queue | `/admin/corrections` | View plays, send to Label Studio |
| ML Models | `/admin/models` | Train models, view metrics |

### API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/games/{id}/extract-clips` | POST | Extract all clips for a game |
| `/api/admin/labelstudio/send` | POST | Send play clip to Label Studio |
| `/api/admin/training/annotations` | GET | Export annotations for training |
| `/api/admin/training/start` | POST | Trigger model training |
| `/api/webhooks/training` | POST | Receive training results |

### Storage Locations (Cloudflare R2)

| Path | Content |
|------|---------|
| `games/{gameId}/video.mp4` | Full game video |
| `clips/{gameId}/{playId}.mp4` | Extracted play clips |
| `models/player_detection/v{n}.pt` | Trained model weights |

---

## Label Studio Setup

### Project Configuration

The Label Studio project should be configured for video annotation with:
- Video player
- Rectangle labels for bounding boxes
- Labels: "player" (can add more like "ball", "referee")

### Labeling Interface Template

```xml
<View>
  <Video name="video" value="$video"/>
  <VideoRectangle name="box" toName="video">
    <Label value="player" background="green"/>
  </VideoRectangle>
</View>
```

### Best Practices

1. **Label ALL players in the frame** - Don't skip any visible players
2. **Tight bounding boxes** - Box should closely fit the player
3. **Consistent labeling** - Same player should have similar box size across frames
4. **Skip bad frames** - If frame is blurry or obstructed, skip it entirely

---

## Why Clips Matter

### The Problem We Solved

Previously, Label Studio showed the FULL game video but annotations referenced frame numbers like 54,000. When training tried to extract frame 54,000 from a 5-minute clip in R2, it got garbage data.

### The Solution

1. Extract actual video CLIPS for each play
2. Clips start at frame 0
3. Label Studio shows only the clip
4. Annotations use frame numbers relative to clip
5. Training extracts correct frames

### Frame Number Example

```
Full Video:     [0.........54000.........108000]
                           ↑
                    Play starts here

WRONG: Annotate frame 54000, but clip in R2 is only 5 min (9000 frames)
       Training extracts frame 54000 → BLACK/GARBAGE

Extracted Clip: [0....150....300]
                 ↑
          Clip starts at 0

RIGHT: Annotate frame 150 in clip
       Training extracts frame 150 → CORRECT FRAME
```

---

## Clip Extraction Triggers

Clips are automatically extracted in TWO scenarios:

### 1. Modal Processing Complete

```
Modal webhook received
    ↓
Plays saved to database
    ↓
POST /api/games/{gameId}/extract-clips (fire-and-forget)
    ↓
Clips ready before user needs them
```

### 2. Manual Annotation Complete

```
User marks plays in /admin/annotate
    ↓
Clicks "Send to Review"
    ↓
POST /api/admin/annotate/{gameId}/complete
    ↓
POST /api/games/{gameId}/extract-clips (fire-and-forget)
    ↓
Clips ready before user needs them
```

---

## Training Requirements

### Minimum Annotations

| Count | Expected mAP | Status |
|-------|--------------|--------|
| < 10 | N/A | Cannot train |
| 10-20 | 30-50% | Minimum viable |
| 50-100 | 60-70% | Good |
| 200+ | 80-90% | Production ready |

### Quality Requirements

- [ ] All players in frame are labeled (not just some)
- [ ] Bounding boxes are tight (not too loose)
- [ ] Frame numbers are valid (within clip length)
- [ ] Clips exist in R2 for all annotated plays

---

## Troubleshooting

### "Clip not found" when clicking Analyze Video Clip

**Cause:** Clips weren't extracted (old game before auto-extraction)

**Fix:**
```bash
curl -X POST http://localhost:3000/api/games/{gameId}/extract-clips
```

### "Frame extraction returning black images" during training

**Cause:** Frame numbers exceed clip length

**Check:** Look at annotation frame numbers vs clip duration
- Clip is 10 seconds at 30fps = 300 frames max
- If annotation has frame 500, it's invalid

**Fix:** Re-annotate using the correct clip in Label Studio

### Metrics dropped after adding more annotations

**Cause:** New annotations have bad frame numbers or partial labeling

**Fix:**
1. Check annotations for quality issues
2. Delete problematic annotations
3. Retrain

---

## Quick Reference Commands

```bash
# Start Label Studio
label-studio start

# Extract clips for a game
curl -X POST http://localhost:3000/api/games/{gameId}/extract-clips

# Check annotation count
curl http://localhost:3000/api/admin/training/annotations | jq '.stats'

# Start training
curl -X POST http://localhost:3000/api/admin/training/start \
  -H "Content-Type: application/json" \
  -d '{"model_type":"player_detection"}'

# Clear bad annotations (if needed)
npx tsx scripts/clear-player-annotations.ts
```

---

## Summary

1. **Videos upload to R2** - Full game stored
2. **Plays detected** - Either by Modal or manually in Annotation UI
3. **Clips extracted** - Automatically when plays are finalized
4. **Label Studio** - Annotate player positions in clips
5. **Training** - Fine-tune YOLO with annotations
6. **Metrics** - Real mAP/precision/recall displayed
7. **Iterate** - Add more annotations, retrain, improve

The key insight: **Clips ensure frame numbers match between Label Studio and training.**
