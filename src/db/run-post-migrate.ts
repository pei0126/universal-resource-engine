import postgres from "postgres";
import { readFileSync } from "fs";
import { resolve } from "path";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function runPostMigrate() {
  const sql = postgres(process.env.DATABASE_URL!, { prepare: false });
  const scriptPath = resolve(__dirname, "post-migrate.sql");
  const script = readFileSync(scriptPath, "utf-8");

  console.log("Applying post-migration SQL...");
  await sql.unsafe(script);
  console.log("✅ EXCLUDE constraint applied successfully!");
  await sql.end();
}

runPostMigrate().catch((err) => {
  console.error("❌ Post-migration failed:", err);
  process.exit(1);
});
