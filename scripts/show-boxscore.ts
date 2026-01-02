import { db } from "../lib/db/drizzle";
import { games } from "../lib/db/schema";
import { eq } from "drizzle-orm";

async function show() {
  const gameId = "500ffbed-04be-486d-bf08-059edbdc756b";
  const [game] = await db
    .select({ boxScore: games.boxScore })
    .from(games)
    .where(eq(games.id, gameId));

  const bs = (game?.boxScore as string) || "";
  console.log("Raw box score:");
  console.log(bs);
  console.log("\n---\nLength:", bs.length);
}

show().then(() => process.exit(0));
