import { type Config } from "drizzle-kit";

export default {
  schema: ["./drizzle/baseline-schema/schema.ts", "./drizzle/baseline-schema/auth-schema.ts"],
  out: "./drizzle",
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
