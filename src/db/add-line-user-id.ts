import { sql } from "drizzle-orm";
import { db } from "./index";

async function main() {
  try {
    await db.execute(sql`ALTER TABLE rentals ADD COLUMN IF NOT EXISTS line_user_id VARCHAR(255);`);
    console.log("Column line_user_id added successfully to rentals");
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

main();
