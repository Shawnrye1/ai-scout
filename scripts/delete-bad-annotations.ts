import { db } from '../lib/db/drizzle';
import { corrections } from '../lib/db/schema';
import { inArray } from 'drizzle-orm';

const badIds = [
  '0a689de0-efe4-4974-a9f5-2dfdd42a0215',
  'e5393b33-70b4-4132-aba1-b26b8a031578',
  'e449b42a-997c-420e-86d4-91122e6f092c',
];

async function deleteBadAnnotations() {
  console.log('Deleting 3 problematic annotations...');

  const result = await db.delete(corrections).where(inArray(corrections.id, badIds));

  console.log('Deleted successfully!');
  console.log('Remaining clean annotations ready for training.');

  process.exit(0);
}

deleteBadAnnotations();
