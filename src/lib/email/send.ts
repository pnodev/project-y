import "@tanstack/react-start/server-only";

import { createEmailProvider } from "~/lib/email/create-provider";
import type { EmailMessage, EmailProvider } from "~/lib/email/types";

let provider: EmailProvider | undefined;

function getEmailProvider(): EmailProvider {
  provider ??= createEmailProvider();
  return provider;
}

/** Logs errors without blocking unless the returned promise is awaited. */
export function sendEmail(message: EmailMessage): Promise<void> {
  let emailProvider: EmailProvider;
  try {
    emailProvider = getEmailProvider();
  } catch (error) {
    console.error("[email] Failed to initialize email provider:", error);
    return Promise.reject(error);
  }

  return emailProvider.send(message).catch((error) => {
    console.error(
      `[email] Failed to send via ${emailProvider.name}:`,
      error
    );
    throw error;
  });
}

/** @deprecated Prefer `sendEmail` — kept for existing auth hooks. */
export function sendAuthEmail(message: EmailMessage) {
  void sendEmail(message);
}
