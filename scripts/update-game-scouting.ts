/**
 * Updates an existing game with scouting report data
 * Usage: npx tsx scripts/update-game-scouting.ts <game-id> [scouting-report-path]
 */

import 'dotenv/config';
import { db } from '../lib/db/drizzle';
import { games } from '../lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import * as fs from 'fs';

async function main() {
  const gameId = process.argv[2];
  const reportPath = process.argv[3] || '/tmp/scouting-report.json';

  if (!gameId) {
    console.log('Usage: npx tsx scripts/update-game-scouting.ts <game-id> [scouting-report-path]');
    console.log('\nFinding recent games...');

    const recentGames = await db.select({
      id: games.id,
      name: games.name,
      createdAt: games.createdAt,
    }).from(games).orderBy(desc(games.createdAt)).limit(5);

    console.log('\nRecent games:');
    for (const g of recentGames) {
      console.log(`  ${g.id} - ${g.name} (${g.createdAt})`);
    }
    process.exit(0);
  }

  // Load scouting report
  if (!fs.existsSync(reportPath)) {
    console.error('Scouting report not found:', reportPath);
    process.exit(1);
  }

  const scoutingReport = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
  console.log('Loaded scouting report from:', reportPath);
  console.log('  Teams:', scoutingReport.homeTeamName, 'vs', scoutingReport.awayTeamName);
  console.log('  Players:', scoutingReport.playerScouting?.players?.length || 0);

  // Update game
  const [updated] = await db.update(games)
    .set({
      geminiAnalysis: scoutingReport,
      updatedAt: new Date(),
    })
    .where(eq(games.id, gameId))
    .returning();

  if (updated) {
    console.log('\n✓ Game updated successfully!');
    console.log(`  View at: http://localhost:3000/game/${gameId}`);
  } else {
    console.error('Game not found:', gameId);
  }
}

main().catch(console.error);
