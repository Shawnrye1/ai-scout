# AI Scout Model Training Workflow

## Overview

This document explains the correct workflow for annotating player data and training the YOLO model. **Following this workflow exactly is critical** - incorrect annotations will break model training.

## The Golden Rule

**Only annotate videos that are sent through the "Analyze Video Clip" button.**

This ensures the video in Label Studio matches the video stored in R2, so frame numbers are consistent.

---

## Correct Workflow

### Step 1: Upload a Game Video

1. Go to **Games → New Game**
2. Upload a video file (or paste a URL)
3. Wait for upload to complete
4. Video is stored in Cloudflare R2

### Step 2: Process the Video

1. Click **Process** on the game
2. Modal.com runs initial detection (players, plays)
3. Detected plays appear in the game view

### Step 3: Send Plays to Label Studio

1. Go to **Admin → Training Queue** (`/admin/corrections`)
2. Find plays that need annotation
3. Click **"Analyze Video Clip"** on a play
4. This sends the play clip to Label Studio with:
   - Pre-signed URL to the R2 video
   - Start/end timestamps for the clip
   - Correct frame reference

### Step 4: Annotate in Label Studio

1. Open Label Studio (http://localhost:8080)
2. Find the task that was just created
3. Draw bounding boxes around **ALL visible players**
4. **Important:** Label every player in every frame you annotate

### Step 5: Save Annotations

1. Click Submit in Label Studio
2. Annotations sync back to AI Scout database
3. Frame numbers will be correct (relative to the clip)

### Step 6: Train the Model

1. Go to **Admin → ML Models** (`/admin/models`)
2. Check annotation count (need 10+ minimum)
3. Click **Train** on YOLOv8 Player Detection
4. Training runs on Modal.com (~1-2 minutes for small datasets)
5. Real metrics appear after training completes

---

## What NOT to Do

### DO NOT:
- Upload videos directly to Label Studio
- Annotate videos from your local machine
- Use videos that aren't in R2
- Annotate only SOME players in a frame (label ALL or skip the frame)
- Use frame numbers beyond the video length

### These mistakes cause:
- Frame number mismatch (e.g., frame 50,000 when video is 5 min)
- Garbage frame extraction during training
- Model training on black/corrupt images
- Metrics that look good but model is useless

---

## Architecture: How It Works

There are TWO paths to get clips ready for annotation:

### Path 1: Modal Auto-Detection (Happy Path)

```
┌─────────────────────────────────────────────────────────────┐
│                     VIDEO UPLOAD                             │
│  User uploads video → Stored in Cloudflare R2               │
│  videoKey: games/{gameId}/video.mp4                         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   MODAL PROCESSING                           │
│  Modal.com processes video → Auto-detects plays             │
│  Each play: { startTimestamp, endTimestamp }                │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│               AUTOMATIC CLIP EXTRACTION                      │
│  Webhook triggers batch clip extraction                     │
│  Downloads video ONCE, extracts all clips                   │
│  Clips stored at: clips/{gameId}/{playId}.mp4               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                 CORRECTIONS QUEUE                            │
│  Plays appear with clips ready                              │
│  Click "Analyze Video Clip" → Label Studio                  │
└─────────────────────────────────────────────────────────────┘
```

### Path 2: Manual Play Annotation (When Modal Gets It Wrong)

```
┌─────────────────────────────────────────────────────────────┐
│                     VIDEO UPLOAD                             │
│  User uploads video → Stored in Cloudflare R2               │
│  Modal processing may fail or detect plays incorrectly      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│               ANNOTATION UI (/admin/annotate)                │
│  User manually marks play boundaries:                       │
│  - Press 'A' to mark play start/end                         │
│  - Drag handles to adjust boundaries                        │
│  - Fill gaps, split plays as needed                         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              "SEND TO REVIEW" BUTTON                         │
│  POST /api/admin/annotate/{gameId}/complete                 │
│  1. Marks annotation as reviewed                            │
│  2. Triggers batch clip extraction (same as Modal)          │
│  3. Clips extracted for ALL manually-created plays          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                 CORRECTIONS QUEUE                            │
│  Plays appear with clips ready                              │
│  Click "Analyze Video Clip" → Label Studio                  │
└─────────────────────────────────────────────────────────────┘
```

### Common Final Steps (Both Paths)

```
┌─────────────────────────────────────────────────────────────┐
│          "ANALYZE VIDEO CLIP" BUTTON                         │
│  1. Clip already exists (pre-extracted)                     │
│  2. Creates Label Studio task with clip URL                 │
│  3. Frame numbers are relative to CLIP (frame 0 = start)    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   LABEL STUDIO                               │
│  User annotates players → Saves to corrections table        │
│  Frame numbers are RELATIVE to the clip                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   TRAINING PIPELINE                          │
│  1. Fetch annotations from /api/admin/training/annotations  │
│  2. Generate pre-signed URLs for CLIPS (not full videos)    │
│  3. Extract frames using clipUrl + frameNumber              │
│  4. Frame numbers match because clips start at 0            │
│  5. Convert bboxes to YOLO format                           │
│  6. Train YOLOv8 on Modal.com GPU                           │
│  7. Return metrics via webhook                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Annotation Best Practices

### Quality > Quantity

- 20 perfect annotations > 100 bad ones
- Each frame should have ALL visible players labeled
- Consistent box sizing (tight around player, not too loose)

### Minimum Requirements

| Stage | Annotations | Expected mAP |
|-------|-------------|--------------|
| Minimum | 10 | ~30-50% |
| Good | 50 | ~60-70% |
| Production | 200+ | ~80-90% |

### What Makes a Good Annotation

- [ ] All players in frame are labeled
- [ ] Bounding boxes are tight (not too loose)
- [ ] Consistent labeling across frames
- [ ] Video source matches R2 (via "Analyze Video Clip")

---

## Troubleshooting

### "Metrics dropped after adding more data"

**Cause:** New annotations have frame numbers that don't exist in the R2 video.

**Fix:**
1. Run `npx tsx scripts/clear-player-annotations.ts`
2. Start fresh using correct workflow above

### "Frame extraction returning black images"

**Cause:** Frame number exceeds video length.

**Check:** Compare frame numbers with video duration:
- Frame 9,000 at 30fps = 5 minutes
- Frame 54,000 at 30fps = 30 minutes
- If video is 5 min but frame is 54,000 → wrong source

### "mAP is very low despite many annotations"

**Possible causes:**
1. Partial annotations (some players not labeled)
2. Frame number mismatch
3. Wrong video source in Label Studio

---

## Quick Reference

```bash
# Clear bad annotations
npx tsx scripts/clear-player-annotations.ts

# Check annotation stats
curl http://localhost:3000/api/admin/training/annotations | jq '.stats'

# Extract clips for an existing game (if processed before auto-extraction was added)
curl -X POST http://localhost:3000/api/games/{gameId}/extract-clips

# Check video sizes in R2
# Frame 9000 @ 30fps = 5 min video minimum

# Start training
curl -X POST http://localhost:3000/api/admin/training/start \
  -H "Content-Type: application/json" \
  -d '{"model_type":"player_detection"}'
```

---

## Summary

1. **Always use "Analyze Video Clip"** to send plays to Label Studio
2. **Label ALL players** in every frame you annotate
3. **Never upload videos directly** to Label Studio
4. **Frame numbers must match** the R2 video clip
5. **Quality over quantity** - 20 good annotations beat 100 bad ones
