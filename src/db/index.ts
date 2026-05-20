import "@tanstack/react-start/server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as authSchema from "./auth-schema";
import * as schema from "./schema";

/**
 * Cache the database connection in development. This avoids creating a new connection on every HMR
 * update.
 */
const globalForDb = globalThis as unknown as {
  conn: postgres.Sql | undefined;
};

const conn =
  globalForDb.conn ?? postgres(process.env.NETLIFY_DATABASE_URL as string);
globalForDb.conn = conn;

export const db = drizzle(conn, { schema: { ...schema, ...authSchema } });
