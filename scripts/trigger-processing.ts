import { db } from '../lib/db/drizzle';
import { games } from '../lib/db/schema';
import { eq } from 'drizzle-orm';
import { getDownloadPresignedUrl } from '../lib/storage/r2';

async function triggerProcessing() {
  const gameId = "7d7ecb07-3557-4c13-9968-f0b951fa434c";

  const game = await db.query.games.findFirst({
    where: eq(games.id, gameId)
  });

  if (game === null || game === undefined) {
    console.log("Game not found");
    return;
  }

  console.log("Game:", game.title);
  console.log("Video Key:", game.videoKey);

  const downloadUrl = await getDownloadPresignedUrl(game.videoKey as string, 3600 * 4);
  console.log("Got presigned download URL");

  const MODAL_ENDPOINT = "https://shawnrearl--ai-scout-trigger-processing.modal.run";
  const webhookUrl = "https://uncanceled-jase-unvouched.ngrok-free.dev/api/webhooks/modal";

  const payload = {
    game_id: gameId,
    video_url: downloadUrl,
    webhook_url: webhookUrl,
    webhook_secret: process.env.MODAL_WEBHOOK_SECRET || "test-secret",
    sport: "basketball",
    anthropic_api_key: process.env.ANTHROPIC_API_KEY,
  };

  console.log("\nTriggering Modal processing...");

  const response = await fetch(MODAL_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  console.log("Response status:", response.status);
  const text = await response.text();
  console.log("Response:", text);
}

triggerProcessing().catch(console.error);
