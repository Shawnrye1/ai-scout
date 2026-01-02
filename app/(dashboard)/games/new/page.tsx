"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Upload,
  Video,
  Loader2,
  CheckCircle,
  Link2,
  FileVideo,
  Home,
  Plane,
  FileText,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  Type,
  X,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type UploadState =
  | "idle"
  | "creating"
  | "uploading"
  | "completing"
  | "done"
  | "error";
type UploadMethod = "file" | "url";
type BoxScoreMethod = "csv" | "paste";

interface BoxScorePlayer {
  jersey: string;
  name: string;
  pts: number | null;
  fgm: number | null;
  fga: number | null;
  tpm: number | null;
  tpa: number | null;
  ftm: number | null;
  fta: number | null;
  oreb: number | null;
  dreb: number | null;
  reb: number | null;
  ast: number | null;
  stl: number | null;
  blk: number | null;
  to: number | null;
  pf: number | null;
}

interface BoxScoreTeam {
  name: string;
  players: BoxScorePlayer[];
  totals?: Partial<BoxScorePlayer>;
}

interface ParsedBoxScore {
  teamA: BoxScoreTeam;
  teamB: BoxScoreTeam;
}

interface SportsTeam {
  id: number;
  name: string;
  sport: string;
  city: string | null;
  state: string | null;
}

export default function NewGamePage() {
  const router = useRouter();
  const [uploadMethod, setUploadMethod] = useState<UploadMethod>("file");
  const [title, setTitle] = useState("");
  const [opponent, setOpponent] = useState("");
  const [opponentTeamId, setOpponentTeamId] = useState<number | null>(null);
  const [isHomeGame, setIsHomeGame] = useState<boolean | null>(null);
  const [gameDate, setGameDate] = useState("");
  const [sport, setSport] = useState<"football" | "basketball" | "">("");
  const [file, setFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState("");
  const [availableTeams, setAvailableTeams] = useState<SportsTeam[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(true);
  const [boxScore, setBoxScore] = useState("");
  const [opponentBoxScore, setOpponentBoxScore] = useState("");
  const [showBoxScore, setShowBoxScore] = useState(false);
  const [boxScoreMethod, setBoxScoreMethod] = useState<BoxScoreMethod>("csv");
  const [parsedBoxScore, setParsedBoxScore] = useState<ParsedBoxScore | null>(
    null,
  );
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrError, setOcrError] = useState("");

  // Fetch available teams for opponent selection
  useEffect(() => {
    async function fetchTeams() {
      try {
        const res = await fetch("/api/sports-teams");
        if (res.ok) {
          const data = await res.json();
          setAvailableTeams(data.teams || []);
        }
      } catch (err) {
        console.error("Failed to fetch teams:", err);
      } finally {
        setTeamsLoading(false);
      }
    }
    fetchTeams();
  }, []);

  // Filter teams by sport if sport is selected
  const filteredTeams = sport
    ? availableTeams.filter((t) => t.sport === sport)
    : availableTeams;

  // Detect video source from URL
  const getVideoSource = (
    url: string,
  ): "hudl" | "youtube" | "vimeo" | "direct" | null => {
    if (!url) return null;
    if (url.includes("hudl.com")) return "hudl";
    if (url.includes("youtube.com") || url.includes("youtu.be"))
      return "youtube";
    if (url.includes("vimeo.com")) return "vimeo";
    if (url.match(/\.(mp4|mov|avi|webm)$/i)) return "direct";
    return null;
  };

  const videoSource = getVideoSource(videoUrl);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0];
      if (selectedFile) {
        // Validate file type
        const validTypes = [
          "video/mp4",
          "video/quicktime",
          "video/x-msvideo",
          "video/webm",
        ];
        if (!validTypes.includes(selectedFile.type)) {
          setError("Please select a valid video file (MP4, MOV, AVI, or WebM)");
          return;
        }
        // Validate file size (5GB max)
        if (selectedFile.size > 5 * 1024 * 1024 * 1024) {
          setError("File size must be less than 5GB");
          return;
        }
        setFile(selectedFile);
        setError("");
        // Auto-fill title if empty
        if (!title) {
          const fileName = selectedFile.name.replace(/\.[^/.]+$/, "");
          setTitle(fileName);
        }
      }
    },
    [title],
  );

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      const input = document.getElementById("video-upload") as HTMLInputElement;
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(droppedFile);
      input.files = dataTransfer.files;
      input.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }, []);

  // Parse CSV box score file using Gemini AI
  const handleCsvUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setOcrError("");
      setOcrLoading(true);

      try {
        const csvText = await file.text();

        if (csvText.trim().split("\n").length < 2) {
          setOcrError("CSV file appears to be empty");
          setOcrLoading(false);
          return;
        }

        // Use Gemini to parse the CSV - handles any format
        const res = await fetch("/api/box-score/parse-csv", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ csvText }),
        });

        const data = await res.json();

        if (!res.ok || data.error) {
          setOcrError(data.error || "Failed to parse CSV");
          setOcrLoading(false);
          return;
        }

        const players: BoxScorePlayer[] = data.players.map((p: any) => ({
          jersey: String(p.jersey || ""),
          name: p.name || "",
          pts: p.pts ?? null,
          fgm: p.fgm ?? null,
          fga: p.fga ?? null,
          tpm: p.tpm ?? null,
          tpa: p.tpa ?? null,
          ftm: p.ftm ?? null,
          fta: p.fta ?? null,
          oreb: p.oreb ?? null,
          dreb: p.dreb ?? null,
          reb: p.reb ?? null,
          ast: p.ast ?? null,
          stl: p.stl ?? null,
          blk: p.blk ?? null,
          to: p.to ?? null,
          pf: p.pf ?? null,
        }));

        if (players.length === 0) {
          setOcrError("No player data found in CSV");
          setOcrLoading(false);
          return;
        }

        // Set as teamA
        setParsedBoxScore({
          teamA: { name: "Team A", players },
          teamB: { name: "Team B", players: [] },
        });

        // Convert to text format for the API
        const boxScoreText = players
          .map(
            (p) =>
              `#${p.jersey || "?"} ${p.name}: ${p.pts ?? 0}pts, ${p.fgm ?? 0}-${p.fga ?? 0}FG, ${p.tpm ?? 0}-${p.tpa ?? 0}3PT, ${p.ftm ?? 0}-${p.fta ?? 0}FT, ${p.reb ?? 0}reb, ${p.ast ?? 0}ast, ${p.stl ?? 0}stl, ${p.blk ?? 0}blk`,
          )
          .join("\n");
        setBoxScore(boxScoreText);
      } catch (err) {
        console.error("CSV parse error:", err);
        setOcrError("Failed to parse CSV file. Try the Paste option instead.");
      } finally {
        setOcrLoading(false);
      }
    },
    [],
  );

  // Clear box score data
  const clearBoxScore = useCallback(() => {
    setBoxScore("");
    setParsedBoxScore(null);
    setOcrError("");
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate based on upload method
    if (uploadMethod === "file" && !file) return;
    if (uploadMethod === "url" && !videoUrl) return;
    if (!title) return;

    setError("");

    try {
      // Step 1: Create game record
      setUploadState("creating");
      const createRes = await fetch("/api/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          opponent: opponent || undefined,
          opponentSportsTeamId: opponentTeamId || undefined,
          isHomeGame: isHomeGame ?? undefined,
          gameDate: gameDate || undefined,
          sport: sport || undefined,
          boxScore: boxScore || undefined,
          opponentBoxScore: opponentBoxScore || undefined,
          // If URL method, include the video URL directly
          ...(uploadMethod === "url" && { videoUrl, videoSource }),
        }),
      });

      if (!createRes.ok) {
        throw new Error("Failed to create game");
      }

      const { game } = await createRes.json();

      // If URL method, skip upload steps and go straight to processing
      if (uploadMethod === "url") {
        setUploadState("completing");

        // Complete with URL
        const completeRes = await fetch("/api/upload/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            gameId: game.id,
            videoUrl,
            videoSource,
          }),
        });

        if (!completeRes.ok) {
          throw new Error("Failed to process video URL");
        }

        setUploadState("done");
        setTimeout(() => {
          router.push(`/game/${game.id}`);
        }, 1500);
        return;
      }

      // File upload flow
      // Step 2: Get presigned upload URL
      const presignedRes = await fetch("/api/upload/presigned", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameId: game.id,
          filename: file!.name,
          contentType: file!.type,
        }),
      });

      if (!presignedRes.ok) {
        throw new Error("Failed to get upload URL");
      }

      const { uploadUrl, key } = await presignedRes.json();

      // Step 3: Upload file to R2
      setUploadState("uploading");

      const xhr = new XMLHttpRequest();
      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          setUploadProgress(Math.round((e.loaded / e.total) * 100));
        }
      });

      await new Promise<void>((resolve, reject) => {
        xhr.open("PUT", uploadUrl);
        xhr.setRequestHeader("Content-Type", file!.type);
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error("Upload failed"));
          }
        };
        xhr.onerror = () => reject(new Error("Upload failed"));
        xhr.send(file);
      });

      // Step 4: Mark upload complete
      setUploadState("completing");
      const completeRes = await fetch("/api/upload/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameId: game.id,
          key,
          fileSize: file!.size,
        }),
      });

      if (!completeRes.ok) {
        throw new Error("Failed to complete upload");
      }

      setUploadState("done");

      // Redirect to game page after a moment
      setTimeout(() => {
        router.push(`/game/${game.id}`);
      }, 1500);
    } catch (err) {
      setUploadState("error");
      setError(err instanceof Error ? err.message : "Upload failed");
    }
  };

  const isUploading = ["creating", "uploading", "completing"].includes(
    uploadState,
  );

  return (
    <div className="p-6 lg:p-8 max-w-2xl mx-auto">
      {/* Back link */}
      <Link
        href="/games"
        className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-6"
      >
        <ArrowLeft className="w-4 h-4 mr-1" />
        Back to Games
      </Link>

      <div className="bg-white rounded-xl border border-gray-200 p-6 sm:p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Upload Game Film
        </h1>
        <p className="text-gray-500 mb-6">
          Upload your game footage and our AI will analyze every player.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Upload Method Toggle */}
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-2">
              Upload Method
            </Label>
            <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
              <button
                type="button"
                onClick={() => setUploadMethod("file")}
                disabled={isUploading}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  uploadMethod === "file"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <FileVideo className="w-4 h-4" />
                Upload File
              </button>
              <button
                type="button"
                onClick={() => setUploadMethod("url")}
                disabled={isUploading}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  uploadMethod === "url"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <Link2 className="w-4 h-4" />
                Paste URL
              </button>
            </div>
          </div>

          {/* File Upload Area */}
          {uploadMethod === "file" && (
            <div>
              <Label className="block text-sm font-medium text-gray-700 mb-2">
                Video File
              </Label>
              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                  file
                    ? "border-green-300 bg-green-50"
                    : "border-gray-300 hover:border-[#0f2d52]"
                }`}
              >
                <input
                  id="video-upload"
                  type="file"
                  accept="video/mp4,video/quicktime,video/x-msvideo,video/webm"
                  onChange={handleFileSelect}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={isUploading}
                />
                {file ? (
                  <div className="flex items-center justify-center gap-3">
                    <Video className="w-8 h-8 text-green-600" />
                    <div className="text-left">
                      <p className="font-medium text-gray-900">{file.name}</p>
                      <p className="text-sm text-gray-500">
                        {(file.size / 1024 / 1024).toFixed(1)} MB
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600 mb-1">
                      Drag and drop your video here, or click to browse
                    </p>
                    <p className="text-sm text-gray-400">
                      MP4, MOV, AVI, WebM up to 5GB
                    </p>
                  </>
                )}
              </div>
            </div>
          )}

          {/* URL Input */}
          {uploadMethod === "url" && (
            <div>
              <Label className="block text-sm font-medium text-gray-700 mb-2">
                Video URL
              </Label>
              <Input
                type="url"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://www.hudl.com/video/... or YouTube/direct video link"
                disabled={isUploading}
                className="mb-2"
              />
              {videoSource && (
                <div
                  className={`flex items-center gap-2 text-sm ${
                    videoSource === "hudl"
                      ? "text-orange-600"
                      : videoSource === "youtube"
                        ? "text-red-600"
                        : videoSource === "vimeo"
                          ? "text-blue-600"
                          : "text-green-600"
                  }`}
                >
                  <CheckCircle className="w-4 h-4" />
                  {videoSource === "hudl" && "Hudl video detected"}
                  {videoSource === "youtube" && "YouTube video detected"}
                  {videoSource === "vimeo" && "Vimeo video detected"}
                  {videoSource === "direct" && "Direct video link detected"}
                </div>
              )}
              <p className="text-xs text-gray-500 mt-2">
                Supported: Hudl, YouTube, Vimeo, or direct video links (.mp4,
                .mov, etc.)
              </p>
            </div>
          )}

          {/* Game Details */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label
                htmlFor="title"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Game Title *
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Week 5 vs Lincoln High"
                required
                disabled={isUploading}
              />
            </div>
            <div>
              <Label
                htmlFor="opponent"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Opponent Team
              </Label>
              {filteredTeams.length > 0 ? (
                <select
                  id="opponent"
                  value={opponentTeamId || ""}
                  onChange={(e) => {
                    const teamId = e.target.value
                      ? parseInt(e.target.value)
                      : null;
                    setOpponentTeamId(teamId);
                    const team = filteredTeams.find((t) => t.id === teamId);
                    if (team) setOpponent(team.name);
                  }}
                  disabled={isUploading}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0f2d52]"
                >
                  <option value="">Select opponent team...</option>
                  {filteredTeams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}{" "}
                      {team.city && team.state
                        ? `(${team.city}, ${team.state})`
                        : ""}
                    </option>
                  ))}
                </select>
              ) : (
                <Input
                  id="opponent"
                  value={opponent}
                  onChange={(e) => setOpponent(e.target.value)}
                  placeholder="e.g., Lincoln High"
                  disabled={isUploading}
                />
              )}
              {!teamsLoading && filteredTeams.length === 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  No teams in database.{" "}
                  <Link
                    href="/admin/teams"
                    className="text-[#0f2d52] hover:underline"
                  >
                    Add teams
                  </Link>{" "}
                  to enable roster matching.
                </p>
              )}
            </div>
            <div>
              <Label className="block text-sm font-medium text-gray-700 mb-1">
                Home / Away
              </Label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsHomeGame(true)}
                  disabled={isUploading}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${
                    isHomeGame === true
                      ? "border-[#0f2d52] bg-[#0f2d52]/5 text-[#0f2d52]"
                      : "border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  <Home className="w-4 h-4" />
                  Home
                </button>
                <button
                  type="button"
                  onClick={() => setIsHomeGame(false)}
                  disabled={isUploading}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${
                    isHomeGame === false
                      ? "border-[#0f2d52] bg-[#0f2d52]/5 text-[#0f2d52]"
                      : "border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  <Plane className="w-4 h-4" />
                  Away
                </button>
              </div>
            </div>
            <div>
              <Label
                htmlFor="date"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Game Date
              </Label>
              <Input
                id="date"
                type="date"
                value={gameDate}
                onChange={(e) => setGameDate(e.target.value)}
                disabled={isUploading}
              />
            </div>
            <div className="sm:col-span-2">
              <Label className="block text-sm font-medium text-gray-700 mb-2">
                Sport (or let AI detect)
              </Label>
              <div className="flex gap-3">
                {[
                  { value: "", label: "Auto-detect" },
                  { value: "football", label: "Football" },
                  { value: "basketball", label: "Basketball" },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setSport(option.value as any)}
                    disabled={isUploading}
                    className={`flex-1 py-2.5 px-4 rounded-lg border text-sm font-medium transition-colors ${
                      sport === option.value
                        ? "border-[#0f2d52] bg-[#0f2d52]/5 text-[#0f2d52]"
                        : "border-gray-200 text-gray-600 hover:border-gray-300"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Box Score (Optional, Collapsible) */}
          <div className="border border-gray-200 rounded-lg">
            <button
              type="button"
              onClick={() => setShowBoxScore(!showBoxScore)}
              className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-gray-500" />
                <span className="font-medium text-gray-700">Box Score</span>
                <span className="text-xs text-gray-400">
                  (optional - helps with player stats)
                </span>
                {(boxScore || opponentBoxScore) && (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                    {boxScore && opponentBoxScore
                      ? "Both Teams"
                      : boxScore
                        ? "Your Team"
                        : "Opponent"}
                  </span>
                )}
              </div>
              {showBoxScore ? (
                <ChevronUp className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              )}
            </button>
            {showBoxScore && (
              <div className="px-4 pb-4 border-t border-gray-100">
                {/* Method Selection */}
                <div className="flex gap-2 mt-3 mb-4">
                  <button
                    type="button"
                    onClick={() => setBoxScoreMethod("csv")}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                      boxScoreMethod === "csv"
                        ? "bg-[#0f2d52] text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    CSV
                  </button>
                  <button
                    type="button"
                    onClick={() => setBoxScoreMethod("paste")}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                      boxScoreMethod === "paste"
                        ? "bg-[#0f2d52] text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    <Type className="w-4 h-4" />
                    Paste
                  </button>
                </div>

                {/* CSV Upload */}
                {boxScoreMethod === "csv" && !parsedBoxScore && (
                  <div className="relative border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-[#0f2d52] transition-colors">
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleCsvUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      disabled={isUploading}
                    />
                    <FileSpreadsheet className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600 mb-1">
                      Drop CSV file or click to browse
                    </p>
                    <p className="text-xs text-gray-400">
                      Export from GameChanger, MaxPreps, or any stats app
                    </p>
                  </div>
                )}

                {/* Paste Text */}
                {boxScoreMethod === "paste" && !parsedBoxScore && (
                  <textarea
                    value={boxScore}
                    onChange={(e) => setBoxScore(e.target.value)}
                    placeholder={`Paste box score here. Include both teams if available.

Example:
#32 Cooper Flagg: 23pts, 10-17FG, 2-53PT, 1-2FT, 3reb, 5ast, 2stl, 8blk
#1 R. Wright III: 15pts, 6-11FG, 3-53PT, 0-0FT, 3reb, 9ast, 1stl, 0blk`}
                    disabled={isUploading}
                    className="w-full h-40 px-3 py-2 text-sm font-mono border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0f2d52] resize-none"
                  />
                )}

                {/* Error Message */}
                {ocrError && (
                  <div className="flex items-center gap-2 mt-3 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {ocrError}
                  </div>
                )}

                {/* Parsed Box Score Preview */}
                {parsedBoxScore && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-green-700 flex items-center gap-1">
                        <CheckCircle className="w-4 h-4" />
                        Box score loaded
                      </span>
                      <button
                        type="button"
                        onClick={clearBoxScore}
                        className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
                      >
                        <X className="w-3 h-3" />
                        Clear
                      </button>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3 max-h-48 overflow-y-auto">
                      {parsedBoxScore.teamA.players.length > 0 && (
                        <div className="mb-3">
                          <p className="text-xs font-semibold text-gray-500 mb-1">
                            {parsedBoxScore.teamA.name}
                          </p>
                          <div className="space-y-1">
                            {parsedBoxScore.teamA.players
                              .slice(0, 5)
                              .map((p, i) => (
                                <div
                                  key={i}
                                  className="text-xs text-gray-700 font-mono"
                                >
                                  #{p.jersey} {p.name}: {p.pts ?? "-"}pts,{" "}
                                  {p.reb ?? "-"}reb, {p.ast ?? "-"}ast
                                </div>
                              ))}
                            {parsedBoxScore.teamA.players.length > 5 && (
                              <p className="text-xs text-gray-400">
                                +{parsedBoxScore.teamA.players.length - 5} more
                                players
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                      {parsedBoxScore.teamB.players.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-gray-500 mb-1">
                            {parsedBoxScore.teamB.name}
                          </p>
                          <div className="space-y-1">
                            {parsedBoxScore.teamB.players
                              .slice(0, 5)
                              .map((p, i) => (
                                <div
                                  key={i}
                                  className="text-xs text-gray-700 font-mono"
                                >
                                  #{p.jersey} {p.name}: {p.pts ?? "-"}pts,{" "}
                                  {p.reb ?? "-"}reb, {p.ast ?? "-"}ast
                                </div>
                              ))}
                            {parsedBoxScore.teamB.players.length > 5 && (
                              <p className="text-xs text-gray-400">
                                +{parsedBoxScore.teamB.players.length - 5} more
                                players
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Show confirmation when using paste and text exists */}
                {boxScoreMethod === "paste" &&
                  (boxScore || opponentBoxScore) &&
                  !parsedBoxScore && (
                    <div className="flex items-center gap-2 mt-3 p-3 bg-blue-50 text-blue-700 rounded-lg text-sm">
                      <CheckCircle className="w-4 h-4 flex-shrink-0" />
                      <span>
                        {boxScore &&
                          `Your team: ${boxScore.split("\n").filter(Boolean).length} lines`}
                        {boxScore && opponentBoxScore && " | "}
                        {opponentBoxScore &&
                          `Opponent: ${opponentBoxScore.split("\n").filter(Boolean).length} lines`}
                      </span>
                    </div>
                  )}
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 text-red-600 rounded-lg p-3 text-sm">
              {error}
            </div>
          )}

          {/* Upload Progress */}
          {isUploading && (
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-2">
                <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                <span className="font-medium text-blue-900">
                  {uploadState === "creating" && "Creating game..."}
                  {uploadState === "uploading" &&
                    `Uploading video... ${uploadProgress}%`}
                  {uploadState === "completing" && "Finishing up..."}
                </span>
              </div>
              {uploadState === "uploading" && (
                <div className="h-2 bg-blue-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              )}
            </div>
          )}

          {/* Success State */}
          {uploadState === "done" && (
            <div className="bg-green-50 rounded-lg p-4 flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="font-medium text-green-900">
                Upload complete! Redirecting to your game...
              </span>
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={
              (uploadMethod === "file" && !file) ||
              (uploadMethod === "url" && !videoUrl) ||
              !title ||
              isUploading ||
              uploadState === "done"
            }
            className="w-full bg-[#0f2d52] hover:bg-[#1a4a7a] py-3 text-base"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {uploadMethod === "url" ? "Processing..." : "Uploading..."}
              </>
            ) : (
              <>
                {uploadMethod === "url" ? (
                  <Link2 className="w-4 h-4 mr-2" />
                ) : (
                  <Upload className="w-4 h-4 mr-2" />
                )}
                {uploadMethod === "url"
                  ? "Import & Analyze"
                  : "Upload & Analyze"}
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
