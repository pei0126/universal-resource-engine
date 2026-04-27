import { db } from "./src/db";
import { sql } from "drizzle-orm";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function run() {
  console.log("-> Adding PICKED_UP to rental_status enum...");
  try {
    await db.execute(sql`ALTER TYPE rental_status ADD VALUE 'PICKED_UP';`);
    console.log("   Success.");
  } catch (e: any) {
    console.log("   Skipped or Error:", e.message);
  }

  console.log("-> Adding picked_up_at column to rentals...");
  try {
    await db.execute(sql`ALTER TABLE rentals ADD COLUMN picked_up_at timestamp with time zone;`);
    console.log("   Success.");
  } catch (e: any) {
    console.log("   Skipped or Error:", e.message);
  }

  console.log("DONE!");
  process.exit(0);
}
run();
