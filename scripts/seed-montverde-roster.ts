/**
 * Seed Montverde Academy 2023-24 Basketball Roster
 */

import { db } from '@/lib/db/drizzle';
import { sportsTeams, sportsTeamPlayers, teams } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

const MONTVERDE_ROSTER = [
  { jerseyNumber: 1, name: 'Robert Wright', position: 'PG', height: "6'1\"", yearGrade: 'Senior' },
  { jerseyNumber: 2, name: 'Dhani Miller', position: 'G', height: "6'3\"", yearGrade: 'Sophomore' },
  { jerseyNumber: 3, name: 'Curtis Givens', position: 'G', height: "6'3\"", yearGrade: 'Senior' },
  { jerseyNumber: 4, name: 'Gabe Nesmith', position: 'G', height: "6'5\"", yearGrade: 'Freshman' },
  { jerseyNumber: 11, name: 'Ace Flagg', position: 'SF', height: "6'7\"", yearGrade: 'Junior' },
  { jerseyNumber: 12, name: 'Caleb Gaskins', position: 'SG', height: "6'8\"", yearGrade: 'Sophomore' },
  { jerseyNumber: 14, name: 'Asa Newell', position: 'PF', height: "6'10\"", yearGrade: 'Senior' },
  { jerseyNumber: 15, name: 'Lucas Lima', position: 'SF', height: "6'6\"", yearGrade: 'Senior' },
  { jerseyNumber: 21, name: 'Kayden Allen', position: 'SG', height: "6'6\"", yearGrade: 'Sophomore' },
  { jerseyNumber: 25, name: 'Derik Queen', position: 'C', height: "6'10\"", yearGrade: 'Senior' },
  { jerseyNumber: 30, name: 'Liam McNeeley', position: 'SG', height: "6'8\"", yearGrade: 'Senior' },
  { jerseyNumber: 32, name: 'Cooper Flagg', position: 'SF', height: "6'9\"", yearGrade: 'Senior' },
];

async function seedMontverdeRoster() {
  console.log('Seeding Montverde Academy roster...');

  // Check if Montverde Academy already exists
  const existingTeam = await db
    .select()
    .from(sportsTeams)
    .where(eq(sportsTeams.name, 'Montverde Academy'))
    .limit(1);

  let sportsTeamId: number;

  if (existingTeam.length > 0) {
    sportsTeamId = existingTeam[0].id;
    console.log(`Found existing team: ${sportsTeamId}`);

    // Delete existing players
    await db.delete(sportsTeamPlayers).where(eq(sportsTeamPlayers.sportsTeamId, sportsTeamId));
    console.log('Cleared existing players');
  } else {
    // Create the sports team
    const [newTeam] = await db
      .insert(sportsTeams)
      .values({
        name: 'Montverde Academy',
        sport: 'basketball',
        city: 'Montverde',
        state: 'Florida',
        jerseyColorHome: 'Navy Blue',
        jerseyColorAway: 'White',
        conference: 'NIBC',
        division: 'High School',
      })
      .returning();

    sportsTeamId = newTeam.id;
    console.log(`Created new team: ${sportsTeamId}`);
  }

  // Add all players
  for (const player of MONTVERDE_ROSTER) {
    await db.insert(sportsTeamPlayers).values({
      sportsTeamId,
      jerseyNumber: player.jerseyNumber,
      name: player.name,
      position: player.position,
      height: player.height,
      yearGrade: player.yearGrade,
    });
    console.log(`Added #${player.jerseyNumber} ${player.name}`);
  }

  // Link to user's team if exists (find first team without a sportsTeamId)
  const userTeam = await db
    .select()
    .from(teams)
    .where(eq(teams.sportsTeamId, null as any))
    .limit(1);

  if (userTeam.length > 0) {
    await db
      .update(teams)
      .set({ sportsTeamId })
      .where(eq(teams.id, userTeam[0].id));
    console.log(`Linked to user team: ${userTeam[0].name}`);
  }

  console.log(`\nDone! Added ${MONTVERDE_ROSTER.length} players to Montverde Academy`);
}

seedMontverdeRoster()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Error seeding roster:', err);
    process.exit(1);
  });
