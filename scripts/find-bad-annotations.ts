import { db } from '../lib/db/drizzle';
import { corrections } from '../lib/db/schema';
import { eq } from 'drizzle-orm';

async function findBadAnnotations() {
  const all = await db.select({
    id: corrections.id,
    correctedData: corrections.correctedData,
  }).from(corrections).where(eq(corrections.correctionType, 'player_annotation'));

  console.log(`Total player annotations: ${all.length}\n`);

  const bad: { id: string; frames: Record<number, number> }[] = [];

  for (const c of all) {
    const data = c.correctedData as any;
    if (!data?.players) continue;

    // Group by frame and count bboxes
    const frames: Record<number, number> = {};
    for (const p of data.players) {
      const frame = p.frame || 0;
      frames[frame] = (frames[frame] || 0) + 1;
    }

    // Flag if any frame has fewer than 5 bboxes
    const lowFrames = Object.entries(frames).filter(([_, count]) => count < 5);
    if (lowFrames.length > 0) {
      bad.push({ id: c.id, frames });
    }
  }

  console.log('Problematic annotations (frames with <5 bboxes):');
  console.log('================================================');
  for (const b of bad) {
    console.log(`\nID: ${b.id}`);
    for (const [frame, count] of Object.entries(b.frames)) {
      const status = count < 5 ? '⚠️ LOW' : '✓';
      console.log(`  Frame ${frame}: ${count} bboxes ${status}`);
    }
  }

  console.log(`\n================================================`);
  console.log(`Total problematic annotations: ${bad.length}`);
  console.log(`IDs to potentially delete:`);
  bad.forEach(b => console.log(`  ${b.id}`));

  process.exit(0);
}

findBadAnnotations();
