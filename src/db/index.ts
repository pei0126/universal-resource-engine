import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL!;

// For Supabase pooler (transaction mode on port 6543),
// prepare: false is required.
const client = postgres(connectionString, { prepare: false });

export const db = drizzle(client, { schema });
