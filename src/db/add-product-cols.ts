import { sql } from "drizzle-orm";
import { db } from "./index";

async function main() {
  try {
    await db.execute(sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url VARCHAR(1024);`);
    await db.execute(sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_quantity INTEGER DEFAULT 0;`);
    console.log("Columns added successfully");
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

main();
