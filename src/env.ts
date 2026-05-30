import "@tanstack/react-start/server-only";

import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    NETLIFY_DATABASE_URL: z.string().url(),
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.string().url(),
    GOOGLE_CLIENT_ID: z.string().min(1).optional(),
    GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),
    EMAIL_PROVIDER: z.enum(["mailjet", "console"]).optional(),
    MAILJET_API_KEY: z.string().min(1).optional(),
    MAILJET_API_SECRET: z.string().min(1).optional(),
    EMAIL_FROM: z.string().email().optional(),
    EMAIL_FROM_NAME: z.string().min(1).optional(),
    SYNC_APP_ID: z.string().min(1),
    SYNC_PUBLISH_KEY: z.string().min(1),
    UPLOADTHING_TOKEN: z.string().min(1),
    SYNC_ENGINE_URL: z.string().url().optional(),
    GITHUB_APP_ID: z.string().min(1).optional(),
    GITHUB_APP_PRIVATE_KEY: z.string().min(1).optional(),
    GITHUB_APP_WEBHOOK_SECRET: z.string().min(1).optional(),
    GITHUB_APP_CLIENT_ID: z.string().min(1).optional(),
    GITHUB_APP_CLIENT_SECRET: z.string().min(1).optional(),
    GIT_TOKEN_ENCRYPTION_KEY: z.string().min(32).optional(),
    UPSTASH_REDIS_REST_URL: z.string().url().optional(),
    UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),
  },

  clientPrefix: "PUBLIC_",

  client: {},

  runtimeEnv: process.env,

  emptyStringAsUndefined: true,
});

export function isGitHubConfigured() {
  return Boolean(
    env.GITHUB_APP_ID &&
      env.GITHUB_APP_PRIVATE_KEY &&
      env.GITHUB_APP_WEBHOOK_SECRET &&
      env.GIT_TOKEN_ENCRYPTION_KEY
  );
}

/** Personal GitHub account linking (user-to-server OAuth). */
export function isGitHubUserOAuthConfigured() {
  return Boolean(
    isGitHubConfigured() &&
      env.GITHUB_APP_CLIENT_ID &&
      env.GITHUB_APP_CLIENT_SECRET
  );
}

export function isRedisConfigured() {
  return Boolean(env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN);
}
