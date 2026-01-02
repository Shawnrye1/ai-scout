"use client";

import { useState, useEffect } from "react";
import {
  Check,
  X,
  ChevronRight,
  Loader2,
  RefreshCw,
  User,
  Edit3,
  Eye,
  Sparkles,
} from "lucide-react";

interface ScoutingData {
  position?: string;
  physicalProfile?: string;
  overallAssessment?: string;
  preferredHand?: string;
  primaryMoves?: string[];
  shootingAbility?: { range?: string; form?: string };
  defensiveRating?: string;
  basketballIQ?: string;
  motor?: string;
  howToGuard?: string;
  howToAttack?: string;
}

interface PlayerReview {
  reviewId: string;
  team: "home" | "away";
  jerseyNumber: number | null;
  playerName: string | null;
  scoutingData: ScoutingData;
}

interface GameWithReviews {
  id: string;
  name: string;
  date: string;
  videoUrl: string | null;
  players: PlayerReview[];
}

interface FewShotStats {
  totalExamples: number;
  totalCorrections: number;
  byObservationType: Record<string, { total: number; corrections: number }>;
}

// Observation fields we can review and verify
const OBSERVATION_FIELDS: Array<{
  key: keyof ScoutingData;
  label: string;
  type: "text" | "select" | "array";
  options?: string[];
}> = [
  {
    key: "position",
    label: "Position",
    type: "select",
    options: ["PG", "SG", "SF", "PF", "C"],
  },
  {
    key: "preferredHand",
    label: "Preferred Hand",
    type: "select",
    options: ["right", "left", "ambidextrous"],
  },
  {
    key: "defensiveRating",
    label: "Defensive Rating",
    type: "select",
    options: ["elite", "above average", "average", "below average", "poor"],
  },
  {
    key: "basketballIQ",
    label: "Basketball IQ",
    type: "select",
    options: ["elite", "above average", "average", "below average", "poor"],
  },
  {
    key: "motor",
    label: "Motor/Effort",
    type: "select",
    options: ["elite", "above average", "average", "below average", "poor"],
  },
  { key: "physicalProfile", label: "Physical Profile", type: "text" },
  { key: "overallAssessment", label: "Overall Assessment", type: "text" },
  { key: "howToGuard", label: "How to Guard", type: "text" },
  { key: "howToAttack", label: "How to Attack", type: "text" },
];

export default function ScoutingReviewQueue() {
  const [games, setGames] = useState<GameWithReviews[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGame, setSelectedGame] = useState<GameWithReviews | null>(
    null,
  );
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerReview | null>(
    null,
  );
  const [fewShotStats, setFewShotStats] = useState<FewShotStats | null>(null);

  // Editing state
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [markExemplary, setMarkExemplary] = useState(false);

  useEffect(() => {
    fetchScoutingReviews();
  }, []);

  useEffect(() => {
    // Reset edited values when player changes
    if (selectedPlayer) {
      const initial: Record<string, string> = {};
      for (const field of OBSERVATION_FIELDS) {
        const value = selectedPlayer.scoutingData[field.key];
        if (field.type === "array" && Array.isArray(value)) {
          initial[field.key] = value.join(", ");
        } else if (typeof value === "object" && value !== null) {
          initial[field.key] = JSON.stringify(value);
        } else {
          initial[field.key] = value?.toString() || "";
        }
      }
      setEditedValues(initial);
      setMarkExemplary(false);
    }
  }, [selectedPlayer?.reviewId]);

  async function fetchScoutingReviews() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/scouting-review");
      if (res.ok) {
        const data = await res.json();
        setGames(data.games || []);
        setFewShotStats(data.fewShotStats || null);
      }
    } catch (error) {
      console.error("Failed to fetch scouting reviews:", error);
    } finally {
      setLoading(false);
    }
  }

  async function submitVerification() {
    if (!selectedPlayer || !selectedGame) return;

    setSubmitting(true);
    try {
      // Build observations array
      const observations = OBSERVATION_FIELDS.map((field) => {
        const originalValue = (() => {
          const val = selectedPlayer.scoutingData[field.key];
          if (field.type === "array" && Array.isArray(val))
            return val.join(", ");
          if (typeof val === "object" && val !== null)
            return JSON.stringify(val);
          return val?.toString() || "";
        })();
        const verifiedValue = editedValues[field.key] || "";
        const wasCorrection = originalValue !== verifiedValue;

        return {
          observationType: field.key,
          originalValue,
          verifiedValue,
          wasCorrection,
        };
      }).filter((obs) => obs.verifiedValue); // Only include non-empty

      const res = await fetch("/api/admin/scouting-review/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reviewId: selectedPlayer.reviewId,
          observations,
          markAsExemplary: markExemplary,
        }),
      });

      if (res.ok) {
        removePlayerFromList(selectedPlayer.reviewId);
      }
    } catch (error) {
      console.error("Failed to verify scouting:", error);
    } finally {
      setSubmitting(false);
    }
  }

  async function skipReview() {
    if (!selectedPlayer) return;

    setSubmitting(true);
    try {
      await fetch(
        `/api/admin/scouting-review/verify?reviewId=${selectedPlayer.reviewId}`,
        {
          method: "DELETE",
        },
      );
      removePlayerFromList(selectedPlayer.reviewId);
    } catch (error) {
      console.error("Failed to skip review:", error);
    } finally {
      setSubmitting(false);
    }
  }

  function removePlayerFromList(reviewId: string) {
    if (selectedGame) {
      const updatedPlayers = selectedGame.players.filter(
        (p) => p.reviewId !== reviewId,
      );
      if (updatedPlayers.length === 0) {
        setGames(games.filter((g) => g.id !== selectedGame.id));
        setSelectedGame(null);
        setSelectedPlayer(null);
      } else {
        const updatedGame = { ...selectedGame, players: updatedPlayers };
        setGames(
          games.map((g) => (g.id === selectedGame.id ? updatedGame : g)),
        );
        setSelectedGame(updatedGame);
        setSelectedPlayer(updatedPlayers[0]);
      }
    }
    fetchScoutingReviews(); // Refresh stats
  }

  const totalPendingPlayers = games.reduce(
    (sum, g) => sum + g.players.length,
    0,
  );

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Games List Panel */}
      <div className="w-80 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              Scouting Review
            </h1>
            <button
              onClick={fetchScoutingReviews}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Verify player scouting observations
          </p>
          {totalPendingPlayers > 0 && (
            <div className="mt-3 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <span className="text-sm font-medium text-blue-800 dark:text-blue-300">
                {totalPendingPlayers} players need review
              </span>
            </div>
          )}

          {/* Few-Shot Learning Stats */}
          {fewShotStats && fewShotStats.totalExamples > 0 && (
            <div className="mt-4 p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span className="text-sm font-semibold text-purple-800 dark:text-purple-300">
                  AI Learning
                </span>
              </div>
              <div className="text-sm text-purple-700 dark:text-purple-300">
                <div>{fewShotStats.totalExamples} verified observations</div>
                <div className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                  {fewShotStats.totalCorrections} corrections improve accuracy
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Games List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
              Loading...
            </div>
          ) : games.length === 0 ? (
            <div className="p-8 text-center">
              <Check className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <p className="text-gray-600 dark:text-gray-300">All caught up!</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                No scouting reviews pending
              </p>
            </div>
          ) : (
            games.map((game) => (
              <button
                key={game.id}
                onClick={() => {
                  setSelectedGame(game);
                  setSelectedPlayer(game.players[0]);
                }}
                className={`w-full text-left p-4 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 ${
                  selectedGame?.id === game.id
                    ? "bg-blue-50 dark:bg-blue-900/30"
                    : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="font-medium text-gray-900 dark:text-white truncate flex-1 mr-2">
                    {game.name}
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                </div>
                {game.date && (
                  <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                    {game.date}
                  </div>
                )}
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                    <User className="w-3.5 h-3.5" />
                    {game.players.length} players
                  </div>
                  <span className="px-2 py-0.5 text-xs rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                    Review
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Players List Panel */}
      {selectedGame && (
        <div className="w-64 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex flex-col">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="font-semibold text-gray-900 dark:text-white truncate">
              {selectedGame.name}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {selectedGame.players.length} players to review
            </p>
          </div>

          <div className="flex-1 overflow-y-auto">
            {selectedGame.players.map((player) => (
              <button
                key={player.reviewId}
                onClick={() => setSelectedPlayer(player)}
                className={`w-full text-left p-3 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 ${
                  selectedPlayer?.reviewId === player.reviewId
                    ? "bg-blue-100 dark:bg-blue-900/30"
                    : ""
                }`}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                      player.team === "home"
                        ? "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"
                        : "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300"
                    }`}
                  >
                    #{player.jerseyNumber || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 dark:text-white truncate">
                      {player.playerName || `Player #${player.jerseyNumber}`}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                      {player.team} •{" "}
                      {player.scoutingData.position || "Unknown"}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Review Detail Panel */}
      <div className="flex-1 bg-gray-100 dark:bg-gray-950 overflow-y-auto">
        {selectedPlayer ? (
          <div className="p-6 max-w-3xl mx-auto">
            {/* Player Header */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
              <div className="flex items-center gap-4">
                <div
                  className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold ${
                    selectedPlayer.team === "home"
                      ? "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"
                      : "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300"
                  }`}
                >
                  #{selectedPlayer.jerseyNumber || "?"}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {selectedPlayer.playerName ||
                      `Player #${selectedPlayer.jerseyNumber}`}
                  </h2>
                  <p className="text-gray-500 dark:text-gray-400 capitalize">
                    {selectedPlayer.team} Team •{" "}
                    {selectedPlayer.scoutingData.position || "Unknown Position"}
                  </p>
                </div>
              </div>

              {/* Overall Assessment */}
              {selectedPlayer.scoutingData.overallAssessment && (
                <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    AI Assessment
                  </div>
                  <p className="text-gray-600 dark:text-gray-400">
                    {selectedPlayer.scoutingData.overallAssessment}
                  </p>
                </div>
              )}
            </div>

            {/* Observation Fields */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
              <div className="flex items-center gap-2 mb-4">
                <Edit3 className="w-5 h-5 text-gray-500" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Review Observations
                </h3>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                Confirm or correct each observation. Your input trains the AI.
              </p>

              <div className="space-y-4">
                {OBSERVATION_FIELDS.map((field) => {
                  const originalValue = (() => {
                    const val = selectedPlayer.scoutingData[field.key];
                    if (field.type === "array" && Array.isArray(val))
                      return val.join(", ");
                    if (typeof val === "object" && val !== null)
                      return JSON.stringify(val);
                    return val?.toString() || "";
                  })();
                  const currentValue = editedValues[field.key] || "";
                  const wasEdited = originalValue !== currentValue;

                  return (
                    <div
                      key={field.key}
                      className="grid grid-cols-3 gap-4 items-start"
                    >
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300 pt-2">
                        {field.label}
                      </label>
                      <div className="col-span-2">
                        {field.type === "select" ? (
                          <select
                            value={currentValue}
                            onChange={(e) =>
                              setEditedValues({
                                ...editedValues,
                                [field.key]: e.target.value,
                              })
                            }
                            className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 ${
                              wasEdited
                                ? "border-yellow-400 dark:border-yellow-600"
                                : "border-gray-300 dark:border-gray-600"
                            }`}
                          >
                            <option value="">Not specified</option>
                            {field.options?.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <textarea
                            value={currentValue}
                            onChange={(e) =>
                              setEditedValues({
                                ...editedValues,
                                [field.key]: e.target.value,
                              })
                            }
                            rows={field.key === "overallAssessment" ? 3 : 2}
                            className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 resize-none ${
                              wasEdited
                                ? "border-yellow-400 dark:border-yellow-600"
                                : "border-gray-300 dark:border-gray-600"
                            }`}
                          />
                        )}
                        {wasEdited && (
                          <div className="mt-1 text-xs text-yellow-600 dark:text-yellow-400">
                            Original: {originalValue || "(empty)"}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Exemplary checkbox */}
              <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={markExemplary}
                    onChange={(e) => setMarkExemplary(e.target.checked)}
                    className="w-4 h-4 rounded"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      Mark as exemplary
                    </span>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Prioritize these observations in future AI prompts
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <button
                onClick={submitVerification}
                disabled={submitting}
                className="flex-1 py-4 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Check className="w-5 h-5" />
                )}
                Verify Scouting
              </button>
              <button
                onClick={skipReview}
                disabled={submitting}
                className="px-6 py-4 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <X className="w-5 h-5" />
                Skip
              </button>
            </div>
          </div>
        ) : selectedGame ? (
          <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
            <div className="text-center">
              <User className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
              <p>Select a player to review</p>
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
            <div className="text-center">
              <Eye className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
              <p>Select a game to start reviewing</p>
              <p className="text-sm mt-2">
                Your reviews help the AI provide better scouting insights
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
