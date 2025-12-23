import { db } from '../lib/db/drizzle';
import { corrections } from '../lib/db/schema';
import { eq } from 'drizzle-orm';

async function clearPlayerAnnotations() {
  console.log('Clearing all player_annotation corrections...');

  // Count before
  const before = await db.select().from(corrections).where(eq(corrections.correctionType, 'player_annotation'));
  console.log(`Found ${before.length} player annotations to delete`);

  // Delete all player annotations
  await db.delete(corrections).where(eq(corrections.correctionType, 'player_annotation'));

  console.log('All player annotations cleared.');
  console.log('\nYou can now start fresh with the correct workflow:');
  console.log('1. Go to Admin → Training Queue');
  console.log('2. Click "Analyze Video Clip" on a play');
  console.log('3. Annotate players in Label Studio');
  console.log('4. Frame numbers will match R2 videos');

  process.exit(0);
}

clearPlayerAnnotations();
