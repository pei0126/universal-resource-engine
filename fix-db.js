import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const sql = postgres(process.env.DATABASE_URL);

async function main() {
  try {
    console.log('Adding business_mode enum...');
    try {
      await sql`CREATE TYPE "public"."business_mode" AS ENUM('RENTAL', 'RESTAURANT', 'RETAIL', 'CLASSROOM')`;
      console.log('Enum created.');
    } catch (e) {
      console.log('Enum may already exist:', e.message);
    }

    console.log('Adding business_mode column...');
    try {
      await sql`ALTER TABLE "tenants" ADD COLUMN "business_mode" "public"."business_mode" DEFAULT 'RENTAL' NOT NULL`;
      console.log('Column business_mode added.');
    } catch (e) {
      console.log('Column business_mode may already exist:', e.message);
    }

    console.log('Adding buffer_duration_minutes column...');
    try {
      await sql`ALTER TABLE "tenants" ADD COLUMN "buffer_duration_minutes" integer DEFAULT 120 NOT NULL`;
      console.log('Column buffer_duration_minutes added.');
    } catch (e) {
      console.log('Column buffer_duration_minutes may already exist:', e.message);
    }
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await sql.end();
  }
}

main();
