"""
Quick test script for Gemini video analysis.
Run: python test_gemini.py <video_url_or_path>
"""

import os
import sys
import json
import google.generativeai as genai
from pathlib import Path

# Configure API
API_KEY = os.environ.get("GOOGLE_GEMINI_API_KEY") or os.environ.get("GEMINI_API_KEY")

if not API_KEY:
    print("ERROR: Set GOOGLE_GEMINI_API_KEY environment variable")
    print("Get key from: https://aistudio.google.com/")
    sys.exit(1)

genai.configure(api_key=API_KEY)

# Use Gemini 2.0 Flash for quick testing (fast + cheap)
model = genai.GenerativeModel("gemini-2.0-flash")


def analyze_video(video_path: str):
    """Analyze a video file with Gemini."""

    print(f"\n{'='*60}")
    print("GEMINI VIDEO ANALYSIS TEST")
    print(f"{'='*60}\n")

    # Upload video file
    print(f"Uploading video: {video_path}")
    video_file = genai.upload_file(video_path)
    print(f"Uploaded: {video_file.uri}")

    # Wait for processing
    import time
    while video_file.state.name == "PROCESSING":
        print("Processing video...")
        time.sleep(5)
        video_file = genai.get_file(video_file.name)

    if video_file.state.name == "FAILED":
        raise ValueError(f"Video processing failed: {video_file.state.name}")

    print(f"Video ready: {video_file.state.name}\n")

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

    response = model.generate_content([video_file, prompt])

    print("\n" + "="*60)
    print("ANALYSIS RESULTS")
    print("="*60 + "\n")
    print(response.text)

    # Try to parse as JSON
    try:
        # Extract JSON from response
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


def analyze_video_from_url(video_url: str):
    """Analyze a video from URL (like R2 presigned URL)."""
    import requests
    import tempfile

    print(f"Downloading video from URL...")
    response = requests.get(video_url, stream=True)
    response.raise_for_status()

    # Save to temp file
    with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as f:
        for chunk in response.iter_content(chunk_size=8192):
            f.write(chunk)
        temp_path = f.name

    print(f"Downloaded to: {temp_path}")

    try:
        result = analyze_video(temp_path)
        return result
    finally:
        os.unlink(temp_path)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python test_gemini.py <video_path_or_url>")
        print("\nExample:")
        print("  python test_gemini.py /path/to/clip.mp4")
        print("  python test_gemini.py 'https://your-r2-url/clip.mp4'")
        sys.exit(1)

    video_input = sys.argv[1]

    if video_input.startswith("http"):
        result = analyze_video_from_url(video_input)
    else:
        result = analyze_video(video_input)

    print("\n" + "="*60)
    print("TEST COMPLETE")
    print("="*60)
