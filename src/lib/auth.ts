import "@tanstack/react-start/server-only";

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { organization } from "better-auth/plugins";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { db } from "~/db";
import * as authSchema from "~/db/auth-schema";
import { env } from "~/env";
import { sendAuthEmail } from "~/lib/email";
import { formatUserName } from "~/lib/utils";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: authSchema,
  }),
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  user: {
    additionalFields: {
      firstname: {
        type: "string",
        required: true,
        input: true,
        returned: true,
      },
      lastname: {
        type: "string",
        required: true,
        input: true,
        returned: true,
      },
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          const nameParts = user.name?.split(" ") ?? [];
          const firstname =
            (user.firstname as string | undefined) ?? nameParts[0] ?? "";
          const lastname =
            (user.lastname as string | undefined) ??
            nameParts.slice(1).join(" ") ??
            "";
          return {
            data: {
              ...user,
              firstname,
              lastname,
              name: formatUserName(firstname, lastname) || user.name,
            },
          };
        },
      },
      update: {
        before: async (user) => {
          const firstname = user.firstname as string | undefined;
          const lastname = user.lastname as string | undefined;
          if (firstname === undefined && lastname === undefined) {
            return { data: user };
          }
          const updateNameParts = (user.name as string | undefined)?.split(" ") ?? [];
          return {
            data: {
              ...user,
              name: formatUserName(
                firstname ?? updateNameParts[0],
                lastname ?? updateNameParts.slice(1).join(" ")
              ),
            },
          };
        },
      },
    },
  },
  emailAndPassword: {
    enabled: true,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      void sendAuthEmail({
        to: user.email,
        subject: "Reset your Project Y password",
        text: `Reset your password by opening this link:\n\n${url}\n\nIf you did not request this, you can ignore this email.`,
      });
    },
  },
  socialProviders:
    env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
      ? {
          google: {
            clientId: env.GOOGLE_CLIENT_ID,
            clientSecret: env.GOOGLE_CLIENT_SECRET,
          },
        }
      : undefined,
  plugins: [
    organization({
      async sendInvitationEmail(data) {
        const inviteLink = `${env.BETTER_AUTH_URL}/accept-invitation/${data.id}`;
        if (process.env.NODE_ENV === "development") {
          console.info(
            `[organization invite] ${data.email} → ${inviteLink}`
          );
          return;
        }
        throw new Error(
          "Organization invitations require a production email provider. Configure sendInvitationEmail in src/lib/auth.ts."
        );
      },
    }),
    tanstackStartCookies(),
  ],
});

export type Session = typeof auth.$Infer.Session;
