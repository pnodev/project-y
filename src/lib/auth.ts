import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { organization } from "better-auth/plugins";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { db } from "~/db";
import * as authSchema from "~/db/auth-schema";
import { env } from "~/env";
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
          const firstname =
            (user.firstname as string | undefined) ??
            user.name?.split(" ")[0] ??
            "";
          const lastname =
            (user.lastname as string | undefined) ??
            user.name?.split(" ").slice(1).join(" ") ??
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
          return {
            data: {
              ...user,
              name: formatUserName(
                firstname ?? (user.name as string)?.split(" ")[0],
                lastname ?? (user.name as string)?.split(" ").slice(1).join(" ")
              ),
            },
          };
        },
      },
    },
  },
  emailAndPassword: {
    enabled: true,
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
        }
        // Wire to your email provider in production.
        void inviteLink;
      },
    }),
    tanstackStartCookies(),
  ],
});

export type Session = typeof auth.$Infer.Session;
