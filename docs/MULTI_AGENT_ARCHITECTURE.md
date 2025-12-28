# AI Scout: Multi-Agent Stats Pipeline Architecture

## Goal
Achieve **100% stat accuracy** through:
1. AI-powered detection (target: 85%+ auto-accuracy)
2. Specialist AI review (improves to 95%+)
3. Human review (catches remaining 5%)
4. Active learning (model continuously improves)

Over time: Human review → 0% as AI accuracy → 100%

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         GAME VIDEO INPUT                                │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    AGENT 1: GENERAL DETECTOR                            │
│                    (Gemini 2.0 Flash)                                   │
│                                                                         │
│  • Detects ALL potential stat events                                    │
│  • Assigns confidence score (1-10)                                      │
│  • Categories: scoring, rebounds, steals, blocks, turnovers, fouls     │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
            Confidence 8+    Confidence 5-7    Confidence <5
            (Auto-Accept)    (Specialist)      (Discard)
                    │               │               │
                    ▼               ▼               ▼
            ┌───────────┐   ┌───────────────┐   ┌───────────┐
            │ VERIFIED  │   │ SPECIALIST    │   │ DISCARDED │
            │ STATS     │   │ REVIEW QUEUE  │   │           │
            └───────────┘   └───────────────┘   └───────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
                    ▼               ▼               ▼
            ┌───────────┐   ┌───────────┐   ┌───────────┐
            │ REBOUND   │   │ STEAL     │   │ BLOCK     │
            │ SPECIALIST│   │ SPECIALIST│   │ SPECIALIST│
            │ (Gemini)  │   │ (Gemini)  │   │ (Gemini)  │
            └───────────┘   └───────────┘   └───────────┘
                    │               │               │
                    └───────────────┼───────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
            Verified (7+)    Uncertain (4-6)    Rejected
                    │               │               │
                    ▼               ▼               ▼
            ┌───────────┐   ┌───────────────┐   ┌───────────┐
            │ VERIFIED  │   │ HUMAN REVIEW  │   │ DISCARDED │
            │ STATS     │   │ QUEUE         │   │           │
            └───────────┘   └───────────────┘   └───────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    HUMAN REVIEW INTERFACE                               │
│                    (Label Studio / Custom UI)                           │
│                                                                         │
│  • Shows video clip of uncertain event                                  │
│  • Human confirms/rejects/reclassifies                                  │
│  • Corrections feed into training data                                  │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    ACTIVE LEARNING / TRAINING                           │
│                                                                         │
│  • Verified events + human corrections = training data                  │
│  • Periodically fine-tune prompts or train custom models                │
│  • Track accuracy metrics over time                                     │
│  • Goal: Reduce human review queue to near-zero                         │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    FINAL BOX SCORE                                      │
│                    100% Accurate Stats                                  │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Components

### 1. General Detector Agent
**Model:** Gemini 2.0 Flash
**Purpose:** Detect all potential stat events with confidence scores

**Output per event:**
```json
{
  "type": "rebound",
  "timestamp": "4:32",
  "team": "home",
  "jersey": 22,
  "confidence": 7,
  "reason": "Player grabbed ball after missed shot, but view partially blocked"
}
```

### 2. Specialist Agents
Each stat type has a dedicated specialist with deep domain knowledge.

| Specialist | Focus | Key Criteria |
|------------|-------|--------------|
| Rebound Specialist | Verifies rebounds | Shot miss → ball grab → possession |
| Steal Specialist | Verifies steals | Active takeaway → possession change |
| Block Specialist | Verifies blocks | Shot attempt → ball contact → deflection |
| Turnover Specialist | Verifies turnovers | Possession loss without shot |

**Specialist receives:**
- 6-second video clip around the event
- Original detection details
- Task: Confirm/reject with explanation

### 3. Human Review Interface
**Tool:** Label Studio (open source) or custom UI

**Features needed:**
- Video player with timestamp seeking
- Event details display
- One-click: Confirm / Reject / Reclassify
- Batch processing for efficiency
- Export corrections as training data

### 4. Active Learning Loop
**Process:**
1. Collect verified events (auto + specialist + human)
2. Store as training examples
3. Periodically analyze:
   - Which events get rejected most?
   - Which stat types have lowest accuracy?
   - What patterns cause uncertainty?
4. Update prompts or train custom models
5. Track accuracy improvement over time

---

## Confidence Thresholds

| Confidence | Action | Expected % |
|------------|--------|------------|
| 8-10 | Auto-accept | ~60% of events |
| 5-7 | Specialist review | ~30% of events |
| 1-4 | Discard | ~10% of events |

After specialist review:
| Confidence | Action | Expected % |
|------------|--------|------------|
| 7-10 | Verified | ~80% of specialist queue |
| 4-6 | Human review | ~15% of specialist queue |
| 1-3 | Rejected | ~5% of specialist queue |

**Net result:**
- ~85% auto-verified (no human needed)
- ~10% human review
- ~5% discarded

---

## Data Flow

### Per Game:
1. **Input:** Game video (MP4)
2. **Output:**
   - Verified stats JSON
   - Human review queue JSON
   - Training data updates

### Training Data Format:
```json
{
  "video_path": "/games/game_123.mp4",
  "timestamp": "4:32",
  "event_type": "rebound",
  "team": "home",
  "jersey": 22,
  "verified_by": "human",  // or "specialist" or "auto"
  "original_confidence": 6,
  "final_decision": "confirmed",
  "notes": "Clear defensive rebound after missed 3-pointer"
}
```

---

## Box Score Validation

If actual box score is available, use for validation:

```
Detected Stats vs Actual Box Score
─────────────────────────────────────
HOME Rebounds:  12 detected, 14 actual  (86% accuracy)
HOME Steals:    4 detected, 5 actual    (80% accuracy)
AWAY Rebounds:  15 detected, 13 actual  (85% accuracy, overcounted)
...
```

**Systematic errors** (e.g., always overcounting steals) inform prompt/model improvements.

---

## Implementation Phases

### Phase 1: MVP (Week 1)
- [x] General detector with confidence scoring
- [x] Specialist agents for each stat type
- [ ] JSON export for human review
- [ ] Basic accuracy tracking

### Phase 2: Human Review UI (Week 2)
- [ ] Label Studio integration OR custom review UI
- [ ] Video clip extraction for review
- [ ] One-click verification workflow
- [ ] Corrections database

### Phase 3: Active Learning (Week 3-4)
- [ ] Training data collection pipeline
- [ ] Prompt optimization based on errors
- [ ] Accuracy metrics dashboard
- [ ] A/B testing for prompt variants

### Phase 4: Continuous Improvement (Ongoing)
- [ ] Weekly accuracy reports
- [ ] Automatic prompt updates
- [ ] Custom model training (if needed)
- [ ] Goal: <5% human review rate

---

## Technology Stack

| Component | Technology |
|-----------|------------|
| General Detector | Gemini 2.0 Flash |
| Specialist Agents | Gemini 2.0 Flash (specialized prompts) |
| Video Processing | FFmpeg |
| Human Review | Label Studio / Custom React UI |
| Database | PostgreSQL (existing) |
| Training Data | JSON files → future fine-tuning |
| Orchestration | TypeScript / Node.js |

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Scoring accuracy | 100% |
| Rebounds accuracy | 90%+ |
| Steals accuracy | 85%+ |
| Turnovers accuracy | 85%+ |
| Human review rate | <10% of events |
| Processing time | <1 hour per game |

---

## References

- [Human-in-the-Loop for AI Agents](https://www.permit.io/blog/human-in-the-loop-for-ai-agents-best-practices-frameworks-use-cases-and-demo)
- [Label Studio Active Learning](https://www.labelvisor.com/best-practices-for-data-annotation-with-label-studio/)
- [AI-Powered Sports Labeling](https://www.cloudfactory.com/blog/6-ways-ai-powered-labeling-benefits-sports-analytics)
- [Multi-Agent Architectures 2025](https://www.marktechpost.com/2025/11/15/comparing-the-top-5-ai-agent-architectures-in-2025-hierarchical-swarm-meta-learning-modular-evolutionary/)
