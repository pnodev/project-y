import { type Config } from "drizzle-kit";

export default {
  schema: "./src/db/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.POSTGRES_URL as string,
  },
  tablesFilter: ["project-y_*"],
} satisfies Config;
