import "@tanstack/react-start/server-only";

import { Resend } from "resend";
import { env } from "~/env";

type SendAuthEmailParams = {
  to: string;
  subject: string;
  text: string;
};

export function sendAuthEmail({ to, subject, text }: SendAuthEmailParams) {
  if (env.RESEND_API_KEY && env.EMAIL_FROM) {
    const resend = new Resend(env.RESEND_API_KEY);
    void resend.emails.send({
      from: env.EMAIL_FROM,
      to,
      subject,
      text,
    });
    return;
  }

  console.info(`[auth email] To: ${to}\nSubject: ${subject}\n\n${text}`);
}
