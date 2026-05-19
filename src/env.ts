import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    NETLIFY_DATABASE_URL: z.string().url(),
    CLERK_SECRET_KEY: z.string().min(1),
    SYNC_APP_ID: z.string().min(1),
    SYNC_PUBLISH_KEY: z.string().min(1),
    UPLOADTHING_TOKEN: z.string().min(1),
    SYNC_ENGINE_URL: z.string().url().optional(),
    CLERK_SIGN_IN_URL: z.string().optional(),
  },

  clientPrefix: "PUBLIC_",

  client: {
    PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),
  },

  runtimeEnv: {
    ...process.env,
    PUBLIC_CLERK_PUBLISHABLE_KEY:
      process.env.PUBLIC_CLERK_PUBLISHABLE_KEY ??
      process.env.CLERK_PUBLISHABLE_KEY,
  },

  emptyStringAsUndefined: true,
});
