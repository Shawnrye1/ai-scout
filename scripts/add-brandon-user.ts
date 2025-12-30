import { db } from '../lib/db/drizzle';
import { users, teams, teamMembers } from '../lib/db/schema';
import { hashPassword } from '../lib/auth/session';
import { eq } from 'drizzle-orm';

async function addBrandonUser() {
  const email = 'Brandon@test.com';
  const password = 'coach123';
  const passwordHash = await hashPassword(password);

  // Check if user already exists
  const existingUser = await db.select().from(users).where(eq(users.email, email));
  if (existingUser.length > 0) {
    console.log('User already exists:', existingUser[0]);
    return;
  }

  // Create the user with coach role
  const [user] = await db
    .insert(users)
    .values({
      name: 'Brandon',
      email: email,
      passwordHash: passwordHash,
      role: 'coach',
      emailVerified: true, // Skip email verification for test user
    })
    .returning();

  console.log('Created user:', user);

  // Get the existing team (should be "Test Team" or similar)
  const existingTeams = await db.select().from(teams);
  console.log('Existing teams:', existingTeams);

  if (existingTeams.length > 0) {
    // Add user to the first team as a coach
    const team = existingTeams[0];
    await db.insert(teamMembers).values({
      teamId: team.id,
      userId: user.id,
      role: 'coach',
    });
    console.log(`Added ${email} to team "${team.name}" as coach`);
  } else {
    // Create a new team if none exists
    const [team] = await db
      .insert(teams)
      .values({
        name: 'Demo Team',
      })
      .returning();

    await db.insert(teamMembers).values({
      teamId: team.id,
      userId: user.id,
      role: 'coach',
    });
    console.log(`Created team "Demo Team" and added ${email} as coach`);
  }

  console.log('\n✅ Brandon user created successfully!');
  console.log('Email:', email);
  console.log('Password:', password);
}

addBrandonUser()
  .catch((error) => {
    console.error('Failed to add user:', error);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
