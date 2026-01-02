import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("image") as File;

    if (!file) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    // Convert file to base64
    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");
    const mimeType = file.type || "image/jpeg";

    // Use Gemini Vision to extract box score
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `You are a sports statistics expert. Extract the box score data from this image.

Return a JSON object with this exact structure:
{
  "teamA": {
    "name": "Team Name",
    "players": [
      {
        "jersey": "32",
        "name": "Player Name",
        "pts": 15,
        "fgm": 6,
        "fga": 12,
        "tpm": 1,
        "tpa": 4,
        "ftm": 2,
        "fta": 3,
        "oreb": 1,
        "dreb": 4,
        "reb": 5,
        "ast": 3,
        "stl": 1,
        "blk": 0,
        "to": 2,
        "pf": 2
      }
    ],
    "totals": {
      "pts": 78,
      "fgm": 30,
      "fga": 65,
      "tpm": 8,
      "tpa": 22,
      "ftm": 10,
      "fta": 14,
      "reb": 35,
      "ast": 18,
      "stl": 7,
      "blk": 3,
      "to": 12
    }
  },
  "teamB": {
    "name": "Team Name",
    "players": [...],
    "totals": {...}
  }
}

IMPORTANT:
- Extract ALL players visible in the box score
- Use null for any stat you cannot read clearly
- Jersey numbers should be strings (e.g., "32", "03", "00")
- If you see abbreviations like FG, 3PT, FT, interpret them correctly
- If this is not a box score image, return: {"error": "Not a valid box score image"}

Return ONLY the JSON, no markdown, no explanation.`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType,
          data: base64,
        },
      },
    ]);

    const responseText = result.response.text();

    // Clean up the response (remove markdown if present)
    let cleanJson = responseText.trim();
    if (cleanJson.startsWith("```")) {
      cleanJson = cleanJson
        .replace(/```json?\n?/g, "")
        .replace(/```$/g, "")
        .trim();
    }

    // Parse and validate
    const parsed = JSON.parse(cleanJson);

    if (parsed.error) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    return NextResponse.json({ boxScore: parsed });
  } catch (error) {
    console.error("Box score OCR error:", error);
    return NextResponse.json(
      { error: "Failed to extract box score from image" },
      { status: 500 },
    );
  }
}
