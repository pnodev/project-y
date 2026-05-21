import { useQueryClient } from "@tanstack/react-query";
import { createServerFn, useServerFn } from "@tanstack/react-start";
import { eq, sql } from "drizzle-orm";
import { useCallback } from "react";
import { db } from "~/db";
import {
  userPreferences,
  userPreferencesSchema,
  updateUserPreferencesValidator,
  type UserPreferences,
} from "~/db/schema";
import {
  userPreferencesQueryOptions,
} from "~/db/queries/user-preferences";
import { requireSessionFromRequest } from "~/lib/session";

const updateUserPreferences = createServerFn({ method: "POST" })
  .inputValidator(updateUserPreferencesValidator)
  .handler(async ({ data }): Promise<UserPreferences> => {
    const session = await requireSessionFromRequest();
    const userId = session.user.id;

    const now = new Date();

    await db
      .insert(userPreferences)
      .values({
        userId,
        preferences: userPreferencesSchema.parse(data),
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: userPreferences.userId,
        set: {
          preferences: sql`coalesce(${userPreferences.preferences}, '{}'::jsonb) || ${JSON.stringify(data)}::jsonb`,
          updatedAt: now,
        },
      });

    const row = await db.query.userPreferences.findFirst({
      where: eq(userPreferences.userId, userId),
    });

    return userPreferencesSchema.parse(row?.preferences ?? data);
  });

export function useUpdateUserPreferencesMutation() {
  const queryClient = useQueryClient();
  const _update = useServerFn(updateUserPreferences);

  return useCallback(
    async (patch: Partial<UserPreferences>) => {
      const previous = queryClient.getQueryData<UserPreferences>(
        userPreferencesQueryOptions().queryKey
      );

      const optimistic = userPreferencesSchema.parse({
        ...(previous ?? {}),
        ...patch,
      });

      queryClient.setQueryData(
        userPreferencesQueryOptions().queryKey,
        optimistic
      );

      try {
        const result = await _update({ data: patch });
        queryClient.setQueryData(
          userPreferencesQueryOptions().queryKey,
          result
        );
        return result;
      } catch (error) {
        if (previous !== undefined) {
          queryClient.setQueryData(
            userPreferencesQueryOptions().queryKey,
            previous
          );
        } else {
          queryClient.invalidateQueries({
            queryKey: userPreferencesQueryOptions().queryKey,
          });
        }
        throw error;
      }
    },
    [queryClient, _update]
  );
}
