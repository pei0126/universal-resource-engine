import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const sql = postgres(process.env.DATABASE_URL);

async function main() {
  try {
    console.log('Adding SALES to resourceTypeEnum...');
    try {
      await sql`ALTER TYPE "public"."resource_type" ADD VALUE IF NOT EXISTS 'SALES'`;
      console.log('Added SALES.');
    } catch (e) {
      console.log('SALES may already exist:', e.message);
    }

    console.log('Adding RENTAL to resourceTypeEnum...');
    try {
      await sql`ALTER TYPE "public"."resource_type" ADD VALUE IF NOT EXISTS 'RENTAL'`;
      console.log('Added RENTAL.');
    } catch (e) {
      console.log('RENTAL may already exist:', e.message);
    }
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await sql.end();
  }
}

main();
