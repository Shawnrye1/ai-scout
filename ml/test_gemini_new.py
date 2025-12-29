"""
Quick test script for Gemini video analysis using the new google-genai SDK.
Run: python test_gemini_new.py <video_path>
"""

import os
import sys
import json
from pathlib import Path
from google import genai
from google.genai import types

# Configure API
API_KEY = os.environ.get("GOOGLE_GEMINI_API_KEY") or os.environ.get("GEMINI_API_KEY")

if not API_KEY:
    print("ERROR: Set GOOGLE_GEMINI_API_KEY environment variable")
    print("Get key from: https://aistudio.google.com/")
    sys.exit(1)

# Initialize client
client = genai.Client(api_key=API_KEY)


def analyze_video(video_path: str):
    """Analyze a video file with Gemini 2.0 Flash."""

    print(f"\n{'='*60}")
    print("GEMINI VIDEO ANALYSIS TEST (New SDK)")
    print(f"{'='*60}\n")

    # Check file size
    file_size = os.path.getsize(video_path)
    print(f"File size: {file_size / 1024 / 1024:.2f} MB")

    # Upload video file
    print(f"Uploading video: {video_path}")
    video_file = client.files.upload(file=video_path)
    print(f"Uploaded: {video_file.name}")
    print(f"State: {video_file.state}")

    # Wait for processing
    import time
    while video_file.state == "PROCESSING":
        print("Processing video...")
        time.sleep(5)
        video_file = client.files.get(name=video_file.name)

    if video_file.state == "FAILED":
        raise ValueError(f"Video processing failed: {video_file.state}")

    print(f"Video ready: {video_file.state}\n")

    # Analysis prompt for basketball
    prompt = """You are an expert basketball scout analyzing game film.

Analyze this basketball video clip and provide:

1. **PLAY DETECTION**
   - What type of play is this? (Fast Break, Half Court Set, Pick and Roll, Isolation, Post Up, Transition, etc.)
   - Confidence level (high/medium/low)

2. **PLAYER TRACKING**
   - How many players are visible?
   - List any jersey numbers you can identify
   - Which team has possession?

3. **KEY ACTIONS**
   - What happens in this play? (shot attempt, pass, turnover, etc.)
   - Did the play result in points? If so, how many?
   - Any notable defensive actions?

4. **TIMESTAMPS**
   - When do key moments occur? (e.g., "0:03 - ball handler drives left")

5. **SCOUTING INSIGHTS**
   - What stands out about the offensive execution?
   - Any defensive breakdowns?
   - Player tendencies observed?

Be specific and reference what you actually see in the video.
Format your response as structured JSON.
"""

    print("Analyzing with Gemini 2.0 Flash...")
    print("-" * 40)

    # Try different models - gemini-2.0-flash may have stricter quotas
    model_to_use = os.environ.get("GEMINI_MODEL", "gemini-1.5-flash")
    print(f"Using model: {model_to_use}")

    response = client.models.generate_content(
        model=model_to_use,
        contents=[
            types.Part.from_uri(
                file_uri=video_file.uri,
                mime_type=video_file.mime_type or "video/mp4",
            ),
            prompt,
        ],
    )

    print("\n" + "="*60)
    print("ANALYSIS RESULTS")
    print("="*60 + "\n")
    print(response.text)

    # Try to parse as JSON
    try:
        text = response.text
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0]
        elif "```" in text:
            text = text.split("```")[1].split("```")[0]

        result = json.loads(text)
        print("\n" + "-"*40)
        print("Parsed JSON successfully!")
        return result
    except:
        print("\n(Response was not valid JSON, but analysis complete)")
        return {"raw_response": response.text}


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python test_gemini_new.py <video_path>")
        print("\nExample:")
        print("  python test_gemini_new.py /path/to/clip.mp4")
        sys.exit(1)

    video_input = sys.argv[1]
    result = analyze_video(video_input)

    print("\n" + "="*60)
    print("TEST COMPLETE")
    print("="*60)
