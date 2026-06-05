import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// Lazy factory — avoids module-level neon() call during Next.js build
export function getDb() {
  return drizzle(neon(process.env.DATABASE_URL!), { schema });
}
