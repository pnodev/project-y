import { createServerFn } from "@tanstack/react-start";
import { getAuth } from "@clerk/tanstack-react-start/server";
import { getWebRequest } from "@tanstack/react-start/server";
import { redirect } from "@tanstack/react-router";

export const authStateFn = createServerFn({ method: "GET" }).handler(
  async () => {
    const request = getWebRequest();
    const { userId } = await getAuth(request);

    if (!userId) {
      // This will error because you're redirecting to a path that doesn't exist yet
      // You can create a sign-in route to handle this
      throw redirect({
        to: "/sign-in/$",
      });
    }

    return { userId };
  }
);
