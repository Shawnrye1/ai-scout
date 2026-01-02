import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(request: NextRequest) {
  try {
    const { csvText } = await request.json();

    if (!csvText) {
      return NextResponse.json(
        { error: "No CSV text provided" },
        { status: 400 },
      );
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `Parse this basketball box score CSV and extract player stats.

CSV DATA:
${csvText}

Return a JSON object with this exact structure:
{
  "players": [
    {
      "jersey": "32",
      "name": "Cooper Flagg",
      "pts": 23,
      "fgm": 10,
      "fga": 17,
      "tpm": 2,
      "tpa": 5,
      "ftm": 1,
      "fta": 2,
      "oreb": 0,
      "dreb": 3,
      "reb": 3,
      "ast": 10,
      "stl": 5,
      "blk": 2,
      "to": 3,
      "pf": 2
    }
  ]
}

IMPORTANT:
- Extract ALL players from the CSV
- Jersey numbers should be strings
- Stats should be integers (use 0 if not available)
- If a stat column has format like "10-17" (made-attempted), split it into separate values
- Handle any CSV format (comma, tab, or other delimiters)
- Remove class year (Sr, Jr, So, Fr) from player names but you can include it
- Return ONLY the JSON, no markdown, no explanation`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    // Clean up response
    let cleanJson = responseText.trim();
    if (cleanJson.startsWith("```")) {
      cleanJson = cleanJson
        .replace(/```json?\n?/g, "")
        .replace(/```$/g, "")
        .trim();
    }

    const parsed = JSON.parse(cleanJson);

    if (!parsed.players || parsed.players.length === 0) {
      return NextResponse.json(
        { error: "Could not parse players from CSV" },
        { status: 400 },
      );
    }

    return NextResponse.json({ players: parsed.players });
  } catch (error) {
    console.error("CSV parse error:", error);
    return NextResponse.json({ error: "Failed to parse CSV" }, { status: 500 });
  }
}
