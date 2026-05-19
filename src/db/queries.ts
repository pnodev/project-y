import { createServerFn } from "@tanstack/react-start";
import { auth } from "@clerk/tanstack-react-start/server";
import { redirect } from "@tanstack/react-router";

export const authStateFn = createServerFn({ method: "GET" }).handler(
  async () => {
    const { userId } = await auth();

    if (!userId) {
      throw redirect({
        to: "/sign-in/$",
      });
    }

    return { userId };
  },
);
