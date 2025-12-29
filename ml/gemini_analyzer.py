"""
Gemini Video Analyzer for AI Scout.
Production-ready video analysis using Google Gemini.

Supports both AI Studio API and Vertex AI.
"""

import os
import json
import time
from pathlib import Path
from typing import Optional
from google import genai
from google.genai import types


class GeminiAnalyzer:
    """Analyze basketball videos using Gemini."""

    def __init__(
        self,
        api_key: Optional[str] = None,
        project_id: Optional[str] = None,
        location: str = "us-central1",
        model: str = "gemini-2.0-flash",
    ):
        """
        Initialize the analyzer.

        Args:
            api_key: Google AI Studio API key (for development)
            project_id: Google Cloud project ID (for Vertex AI production)
            location: Vertex AI location
            model: Model to use (gemini-2.0-flash, gemini-2.5-flash, etc.)
        """
        self.model = model

        # Use Vertex AI if project_id provided, otherwise AI Studio
        if project_id:
            self.client = genai.Client(
                vertexai=True,
                project=project_id,
                location=location,
            )
            self.mode = "vertex"
        else:
            api_key = api_key or os.environ.get("GEMINI_API_KEY")
            if not api_key:
                raise ValueError("GEMINI_API_KEY required for AI Studio mode")
            self.client = genai.Client(api_key=api_key)
            self.mode = "ai_studio"

    def analyze_video(
        self,
        video_path: str,
        sport: str = "basketball",
        analysis_type: str = "full",
        gcs_bucket: Optional[str] = None,
    ) -> dict:
        """
        Analyze a video file.

        Args:
            video_path: Path to video file or GCS URI (gs://...)
            sport: Sport type (basketball, football)
            analysis_type: Type of analysis (full, quick, plays_only)
            gcs_bucket: GCS bucket for Vertex AI (required for Vertex)

        Returns:
            Analysis results as dict
        """
        # Handle video source based on mode
        if video_path.startswith("gs://"):
            # Already a GCS URI
            video_uri = video_path
            mime_type = "video/mp4"
            print(f"Using GCS video: {video_uri}")
        elif self.mode == "vertex":
            # Vertex AI requires GCS - upload first
            if not gcs_bucket:
                gcs_bucket = os.environ.get("GCS_BUCKET", "ai-scout-videos")

            video_uri, mime_type = self._upload_to_gcs(video_path, gcs_bucket)
            print(f"Uploaded to GCS: {video_uri}")
        else:
            # AI Studio - use file upload API
            print(f"Uploading video: {video_path}")
            video_file = self.client.files.upload(file=video_path)
            print(f"Uploaded: {video_file.name}")

            # Wait for processing
            while video_file.state == "PROCESSING":
                print("Processing video...")
                time.sleep(3)
                video_file = self.client.files.get(name=video_file.name)

            if video_file.state == "FAILED":
                raise ValueError(f"Video processing failed: {video_file.state}")

            print(f"Video ready: {video_file.state}")
            video_uri = video_file.uri
            mime_type = video_file.mime_type or "video/mp4"

        # Get appropriate prompt
        prompt = self._get_prompt(sport, analysis_type)

        # Run analysis
        print(f"Analyzing with {self.model}...")
        response = self.client.models.generate_content(
            model=self.model,
            contents=[
                types.Part.from_uri(
                    file_uri=video_uri,
                    mime_type=mime_type,
                ),
                prompt,
            ],
        )

        # Parse response
        return self._parse_response(response.text)

    def _upload_to_gcs(self, local_path: str, bucket_name: str) -> tuple[str, str]:
        """Upload a file to Google Cloud Storage for Vertex AI."""
        from google.cloud import storage
        import mimetypes

        # Determine mime type
        mime_type, _ = mimetypes.guess_type(local_path)
        if not mime_type:
            mime_type = "video/mp4"

        # Create unique blob name
        import uuid
        blob_name = f"gemini-uploads/{uuid.uuid4()}/{os.path.basename(local_path)}"

        # Upload to GCS
        client = storage.Client()
        bucket = client.bucket(bucket_name)
        blob = bucket.blob(blob_name)

        print(f"Uploading to gs://{bucket_name}/{blob_name}...")
        blob.upload_from_filename(local_path)

        gcs_uri = f"gs://{bucket_name}/{blob_name}"
        return gcs_uri, mime_type

    def analyze_video_url(self, video_url: str, **kwargs) -> dict:
        """Analyze video from URL (downloads first)."""
        import requests
        import tempfile

        print(f"Downloading video...")
        response = requests.get(video_url, stream=True)
        response.raise_for_status()

        with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
            temp_path = f.name

        try:
            return self.analyze_video(temp_path, **kwargs)
        finally:
            os.unlink(temp_path)

    def _get_prompt(self, sport: str, analysis_type: str) -> str:
        """Get the analysis prompt based on sport and type."""

        if sport == "basketball":
            return self._basketball_prompt(analysis_type)
        elif sport == "football":
            return self._football_prompt(analysis_type)
        else:
            return self._generic_prompt(analysis_type)

    def _basketball_prompt(self, analysis_type: str) -> str:
        """Basketball-specific analysis prompt."""

        base = """You are an expert basketball scout analyzing game film.
Analyze this basketball video and provide detailed scouting analysis.

IMPORTANT: Return your response as valid JSON only, no markdown formatting."""

        if analysis_type == "quick":
            return base + """

Return JSON with:
{
  "play_type": "string (Fast Break, Half Court, Pick and Roll, Isolation, Post Up, Transition)",
  "play_type_confidence": "high/medium/low",
  "result": "string (made shot, missed shot, turnover, foul, etc)",
  "points_scored": number or null,
  "summary": "1-2 sentence description"
}"""

        elif analysis_type == "plays_only":
            return base + """

Segment this video into individual plays. For each play, return:
{
  "plays": [
    {
      "start_time": "MM:SS",
      "end_time": "MM:SS",
      "play_type": "string",
      "result": "string",
      "points": number or null,
      "key_players": ["jersey numbers involved"]
    }
  ],
  "total_plays": number
}"""

        else:  # full analysis
            return base + """

Provide comprehensive analysis:
{
  "play_detection": {
    "play_type": "string (Fast Break, Half Court Set, Pick and Roll, Isolation, Post Up, Transition, etc.)",
    "confidence": "high/medium/low",
    "offensive_set": "string describing the offensive formation/play"
  },
  "player_tracking": {
    "total_players_visible": number,
    "jersey_numbers_identified": ["list of numbers seen"],
    "team_with_possession": "string",
    "ball_handler_jersey": "string or null"
  },
  "play_by_play": [
    {
      "timestamp": "MM:SS",
      "action": "string describing what happened",
      "player_jersey": "string or null"
    }
  ],
  "result": {
    "outcome": "string (made shot, missed shot, turnover, foul, violation, etc)",
    "points_scored": number or null,
    "shot_type": "string or null (layup, jumper, 3-pointer, dunk, free throw)",
    "shot_location": "string or null (paint, mid-range, 3pt line, corner)"
  },
  "scouting_insights": {
    "offensive_execution": "string - what stood out about the offense",
    "defensive_notes": "string - defensive observations",
    "player_tendencies": ["list of observed tendencies"],
    "coaching_notes": "string - suggestions or observations for coaches"
  }
}"""

    def _football_prompt(self, analysis_type: str) -> str:
        """Football-specific analysis prompt."""
        return """You are an expert football scout analyzing game film.
Analyze this football video and provide detailed scouting analysis.

Return JSON with:
{
  "play_type": "string (Run, Pass, Special Teams)",
  "formation_offense": "string",
  "formation_defense": "string",
  "play_result": {
    "yards_gained": number,
    "outcome": "string (completion, incompletion, rush, sack, turnover, etc)"
  },
  "player_grades": [
    {
      "jersey": "string",
      "position": "string",
      "grade": "A/B/C/D/F",
      "notes": "string"
    }
  ],
  "scouting_insights": "string"
}"""

    def _generic_prompt(self, analysis_type: str) -> str:
        """Generic sports analysis prompt."""
        return """Analyze this sports video and provide:
{
  "sport_detected": "string",
  "key_events": [{"timestamp": "MM:SS", "description": "string"}],
  "players_visible": number,
  "summary": "string"
}"""

    def _parse_response(self, text: str) -> dict:
        """Parse JSON from response text."""
        # Clean up response
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0]
        elif "```" in text:
            text = text.split("```")[1].split("```")[0]

        text = text.strip()

        try:
            return json.loads(text)
        except json.JSONDecodeError:
            return {"raw_response": text, "parse_error": True}


# CLI usage
if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
        print("Usage: python gemini_analyzer.py <video_path> [analysis_type]")
        print("  analysis_type: full (default), quick, plays_only")
        sys.exit(1)

    video_path = sys.argv[1]
    analysis_type = sys.argv[2] if len(sys.argv) > 2 else "full"

    # Check for Vertex AI or AI Studio
    project_id = os.environ.get("GOOGLE_CLOUD_PROJECT")
    api_key = os.environ.get("GEMINI_API_KEY")

    analyzer = GeminiAnalyzer(
        api_key=api_key,
        project_id=project_id,
        model=os.environ.get("GEMINI_MODEL", "gemini-2.0-flash"),
    )

    print(f"\nAnalyzing: {video_path}")
    print(f"Mode: {analyzer.mode}")
    print(f"Model: {analyzer.model}")
    print(f"Analysis type: {analysis_type}")
    print("-" * 50)

    result = analyzer.analyze_video(video_path, analysis_type=analysis_type)

    print("\nResults:")
    print(json.dumps(result, indent=2))
