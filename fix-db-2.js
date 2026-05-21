import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
const sql = postgres(process.env.DATABASE_URL);

async function main() {
  try {
    // 1. Enums
    const enums = [
      `CREATE TYPE "public"."resource_type" AS ENUM('EQUIPMENT', 'TABLE', 'MENU_ITEM', 'CLASS_SEAT')`,
      `CREATE TYPE "public"."order_status" AS ENUM('PENDING', 'ACTIVE', 'PICKED_UP', 'RETURNED', 'CANCELLED')`,
      `CREATE TYPE "public"."item_status" AS ENUM('AVAILABLE', 'RENTED', 'MAINTENANCE')`
    ];
    for (const q of enums) {
      try { await sql.unsafe(q); console.log('Enum created:', q); } catch (e) { console.log('Enum exists'); }
    }

    // 2. Tables & Columns
    const alters = [
      `ALTER TABLE "resources" ADD COLUMN "resource_type" "public"."resource_type" DEFAULT 'EQUIPMENT' NOT NULL`,
      `ALTER TABLE "resources" ADD COLUMN "metadata" jsonb`,
      `ALTER TABLE "orders" ADD COLUMN "metadata" jsonb`,
      `ALTER TABLE "orders" ADD COLUMN "picked_up_at" timestamp with time zone`,
      `ALTER TABLE "order_items" ADD COLUMN "item_id" uuid`
    ];

    for (const q of alters) {
      try { await sql.unsafe(q); console.log('Column added:', q); } catch (e) { console.log('Column exists'); }
    }
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await sql.end();
  }
}

main();
