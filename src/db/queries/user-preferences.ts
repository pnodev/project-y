import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";
import { db } from "~/db";
import {
  userPreferences,
  userPreferencesSchema,
  type UserPreferences,
} from "~/db/schema";
import { requireSessionFromRequest } from "~/lib/session";

export const fetchUserPreferences = createServerFn({ method: "GET" }).handler(
  async (): Promise<UserPreferences> => {
    const session = await requireSessionFromRequest();
    const row = await db.query.userPreferences.findFirst({
      where: eq(userPreferences.userId, session.user.id),
    });

    if (!row) {
      return userPreferencesSchema.parse({});
    }

    return userPreferencesSchema.parse(row.preferences);
  }
);

export const userPreferencesQueryOptions = () =>
  queryOptions({
    queryKey: ["user-preferences"],
    queryFn: () => fetchUserPreferences(),
  });

export const useUserPreferencesQuery = () => {
  return useSuspenseQuery(userPreferencesQueryOptions());
};
