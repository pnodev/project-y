import Mailjet, { type SendEmailV3_1 } from "node-mailjet";
import type { EmailMessage, EmailProvider } from "~/lib/email/types";

export type MailjetProviderConfig = {
  apiKey: string;
  apiSecret: string;
  fromEmail: string;
  fromName?: string;
};

export function createMailjetEmailProvider(
  config: MailjetProviderConfig
): EmailProvider {
  const client = Mailjet.apiConnect(config.apiKey, config.apiSecret);

  return {
    name: "mailjet",
    async send({ to, subject, text, html }) {
      const body: SendEmailV3_1.Body = {
        Messages: [
          {
            From: {
              Email: config.fromEmail,
              Name: config.fromName ?? "Project Y",
            },
            To: [{ Email: to }],
            Subject: subject,
            TextPart: text,
            HTMLPart: html ?? text.replace(/\n/g, "<br>"),
          },
        ],
      };

      const result = await client
        .post("send", { version: "v3.1" })
        .request(body);

      const response = result.body as SendEmailV3_1.Response;
      const status = response.Messages?.[0]?.Status;
      if (status !== "success") {
        const errors = response.Messages?.[0]?.Errors;
        throw new Error(
          `Mailjet send failed: ${status ?? "unknown"}${errors ? ` — ${JSON.stringify(errors)}` : ""}`
        );
      }
    },
  };
}
