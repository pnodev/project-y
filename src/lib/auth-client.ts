import { createAuthClient } from "better-auth/react";
import {
  inferAdditionalFields,
  organizationClient,
  twoFactorClient,
} from "better-auth/client/plugins";

export const authClient = createAuthClient({
  plugins: [
    twoFactorClient({
      onTwoFactorRedirect() {
        window.location.assign("/two-factor");
      },
    }),
    organizationClient(),
    inferAdditionalFields({
      user: {
        firstname: { type: "string", required: true },
        lastname: { type: "string", required: true },
      },
    }),
  ],
});

export const { signIn, signUp, signOut, useSession } = authClient;
