import "@tanstack/react-start/server-only";

import { createEmailProvider } from "~/lib/email/create-provider";
import type { EmailMessage, EmailProvider } from "~/lib/email/types";

let provider: EmailProvider | undefined;

function getEmailProvider(): EmailProvider {
  provider ??= createEmailProvider();
  return provider;
}

/** Fire-and-forget; logs errors without blocking the caller (Better Auth pattern). */
export function sendEmail(message: EmailMessage) {
  void getEmailProvider()
    .send(message)
    .catch((error) => {
      console.error(
        `[email] Failed to send via ${getEmailProvider().name}:`,
        error
      );
    });
}

/** @deprecated Prefer `sendEmail` — kept for existing auth hooks. */
export function sendAuthEmail(message: EmailMessage) {
  sendEmail(message);
}
