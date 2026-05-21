import type { EmailMessage, EmailProvider } from "~/lib/email/types";

export function createConsoleEmailProvider(): EmailProvider {
  return {
    name: "console",
    async send({ to, subject, text }) {
      console.info(
        `[email] To: ${to}\nSubject: ${subject}\n\n${text}`
      );
    },
  };
}
