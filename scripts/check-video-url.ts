import { db } from '../lib/db/drizzle';
import { games } from '../lib/db/schema';
import { eq } from 'drizzle-orm';
import { getDownloadPresignedUrl } from '../lib/storage/r2';

async function check() {
  const gameId = "7d7ecb07-3557-4c13-9968-f0b951fa434c";

  const game = await db.query.games.findFirst({
    where: eq(games.id, gameId)
  });

  if (!game) {
    console.log("Game not found");
    return;
  }

  console.log("Game:", game.title);
  console.log("Video Key:", game.videoKey);
  console.log("Video URL in DB:", game.videoUrl);

  if (game.videoKey) {
    const downloadUrl = await getDownloadPresignedUrl(game.videoKey, 3600 * 4);
    console.log("\nPresigned Download URL:");
    console.log(downloadUrl.substring(0, 150) + "...");

    // Test if URL is accessible
    console.log("\nTesting URL accessibility...");
    try {
      const resp = await fetch(downloadUrl, { method: 'HEAD' });
      console.log("Status:", resp.status);
      console.log("Content-Type:", resp.headers.get('content-type'));
      console.log("Content-Length:", resp.headers.get('content-length'));
    } catch (e) {
      console.log("Error:", e);
    }
  }
}

check().catch(console.error);
