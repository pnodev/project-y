import { type Config } from "drizzle-kit";

export default {
  schema: "./src/db/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.NETLIFY_DATABASE_URL as string,
  },
  tablesFilter: ["project-y_*"],
} satisfies Config;
