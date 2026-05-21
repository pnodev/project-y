import { type Config } from "drizzle-kit";

export default {
  schema: ["./src/db/schema.ts", "./src/db/auth-schema.ts"],
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.NETLIFY_DATABASE_URL as string,
  },
  tablesFilter: [
    "project-y_*",
    "user",
    "session",
    "account",
    "two_factor",
    "verification",
    "organization",
    "member",
    "invitation",
  ],
} satisfies Config;
