import 'dotenv/config';
import { db } from '../lib/db/drizzle';
import { games } from '../lib/db/schema';
import { eq } from 'drizzle-orm';
import { getDownloadPresignedUrl } from '../lib/storage/r2';

async function triggerGame() {
  const gameId = process.argv[2];
  if (!gameId) {
    console.log("Usage: npx tsx scripts/trigger-game.ts <gameId>");
    return;
  }

  // Reset game status
  await db.update(games)
    .set({
      status: 'queued',
      processingProgress: 0,
      processingError: null,
    })
    .where(eq(games.id, gameId));

  console.log("Game status reset to queued");

  // Get game details
  const game = await db.query.games.findFirst({
    where: eq(games.id, gameId)
  });

  if (!game || !game.videoKey) {
    console.log("Game not found or no video key");
    return;
  }

  // Get presigned URL
  const downloadUrl = await getDownloadPresignedUrl(game.videoKey, 3600 * 4);
  console.log("Got presigned download URL");

  // Trigger Modal processing
  const MODAL_ENDPOINT = "https://shawnrearl--ai-scout-trigger-processing.modal.run";
  const webhookUrl = `${process.env.BASE_URL}/api/webhooks/modal`;

  const payload = {
    game_id: gameId,
    video_url: downloadUrl,
    webhook_url: webhookUrl,
    webhook_secret: process.env.MODAL_WEBHOOK_SECRET,
    sport: game.sport || "basketball",
    anthropic_api_key: process.env.ANTHROPIC_API_KEY,
  };

  console.log("Webhook URL:", webhookUrl);
  console.log("Triggering Modal processing...");

  const response = await fetch(MODAL_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  console.log("Response status:", response.status);
  const text = await response.text();
  console.log("Response:", text);
}

triggerGame().catch(console.error);
