import "@tanstack/react-start/server-only";

import { env } from "~/env";
import { createConsoleEmailProvider } from "~/lib/email/providers/console";
import { createMailjetEmailProvider } from "~/lib/email/providers/mailjet";
import type { EmailProvider, EmailProviderName } from "~/lib/email/types";

function resolveProviderName(): EmailProviderName {
  if (env.EMAIL_PROVIDER) {
    return env.EMAIL_PROVIDER;
  }

  if (
    env.MAILJET_API_KEY &&
    env.MAILJET_API_SECRET &&
    env.EMAIL_FROM
  ) {
    return "mailjet";
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Email provider not configured for production. Set EMAIL_PROVIDER or provide MAILJET_API_KEY, MAILJET_API_SECRET, and EMAIL_FROM."
    );
  }

  return "console";
}

export function createEmailProvider(): EmailProvider {
  const name = resolveProviderName();

  switch (name) {
    case "mailjet": {
      if (!env.MAILJET_API_KEY || !env.MAILJET_API_SECRET || !env.EMAIL_FROM) {
        throw new Error(
          "EMAIL_PROVIDER=mailjet requires MAILJET_API_KEY, MAILJET_API_SECRET, and EMAIL_FROM"
        );
      }
      return createMailjetEmailProvider({
        apiKey: env.MAILJET_API_KEY,
        apiSecret: env.MAILJET_API_SECRET,
        fromEmail: env.EMAIL_FROM,
        fromName: env.EMAIL_FROM_NAME,
      });
    }
    case "console":
      return createConsoleEmailProvider();
    default: {
      const _exhaustive: never = name;
      return _exhaustive;
    }
  }
}
