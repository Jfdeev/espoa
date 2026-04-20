import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";
import { drizzle } from "drizzle-orm/neon-http";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import * as schema from "./schema";

const envCandidates = [
  resolve(process.cwd(), ".env"),
  resolve(process.cwd(), "../../.env"),
  resolve(process.cwd(), "../../../.env"),
];

const envPath = envCandidates.find((filePath) => existsSync(filePath));
if (envPath) {
  config({ path: envPath });
}

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is required. Set it in the project root .env file.",
  );
}

const sql = neon(process.env.DATABASE_URL);

export const db = drizzle({ client: sql, schema });
