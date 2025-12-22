import 'dotenv/config';
import { db } from '../lib/db/drizzle';
import { games, detectedTeams, detectedPlayers, detectedPlays, playerAnalysis, teamAnalysis, keyMoments } from '../lib/db/schema';
import { eq } from 'drizzle-orm';
import { getDownloadPresignedUrl } from '../lib/storage/r2';

async function resetFull() {
  const gameId = "7d7ecb07-3557-4c13-9968-f0b951fa434c";

  // Get game
  const [game] = await db.select().from(games).where(eq(games.id, gameId));
  if (!game) {
    console.log("Game not found");
    process.exit(1);
  }

  console.log("Game:", game.title);

  // Delete existing analysis data
  const teams = await db.select().from(detectedTeams).where(eq(detectedTeams.gameId, gameId));
  for (const team of teams) {
    // Delete team analysis
    await db.delete(teamAnalysis).where(eq(teamAnalysis.detectedTeamId, team.id));

    // Get players for this team
    const players = await db.select().from(detectedPlayers).where(eq(detectedPlayers.detectedTeamId, team.id));
    for (const player of players) {
      // Delete player analysis and key moments
      await db.delete(playerAnalysis).where(eq(playerAnalysis.detectedPlayerId, player.id));
      await db.delete(keyMoments).where(eq(keyMoments.detectedPlayerId, player.id));
    }

    // Delete players
    await db.delete(detectedPlayers).where(eq(detectedPlayers.detectedTeamId, team.id));
  }

  // Delete teams
  await db.delete(detectedTeams).where(eq(detectedTeams.gameId, gameId));

  // Delete plays
  await db.delete(detectedPlays).where(eq(detectedPlays.gameId, gameId));

  console.log("Deleted existing analysis data");

  // Reset game status
  await db.update(games)
    .set({
      status: 'queued',
      processingProgress: 0,
      processingError: null,
    })
    .where(eq(games.id, gameId));

  console.log("Game status reset to queued");

  // Get presigned URL
  const downloadUrl = await getDownloadPresignedUrl(game.videoKey!, 3600 * 4);
  console.log("Got presigned download URL");

  // Trigger processing
  const webhookUrl = process.env.NEXT_PUBLIC_APP_URL + '/api/webhooks/modal';
  console.log("Webhook URL:", webhookUrl);
  console.log("Triggering Modal processing...");

  const response = await fetch(process.env.MODAL_ENDPOINT!, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      game_id: gameId,
      video_url: downloadUrl,
      webhook_url: webhookUrl,
    }),
  });

  console.log("Response status:", response.status);
  const result = await response.json();
  console.log("Response:", JSON.stringify(result));

  process.exit(0);
}

resetFull();
