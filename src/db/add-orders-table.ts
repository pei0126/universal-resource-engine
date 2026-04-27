import { sql } from "drizzle-orm";
import { db } from "./index";

async function main() {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS orders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        total_amount DECIMAL(10,2) NOT NULL,
        cash_tendered DECIMAL(10,2) NOT NULL DEFAULT 0,
        change_due DECIMAL(10,2) NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    console.log("Orders table created successfully");
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

main();
