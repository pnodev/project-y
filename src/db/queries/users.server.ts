import "@tanstack/react-start/server-only";

import { eq } from "drizzle-orm";
import { db } from "~/db";
import { member, user } from "~/db/auth-schema";
import { formatUserName } from "~/lib/utils";
import type { AppUser } from "~/db/queries/users";

type AuthSession = Awaited<
  ReturnType<typeof import("~/lib/auth").auth.api.getSession>
>;

export async function getUsersForSession(
  session: NonNullable<AuthSession>,
): Promise<AppUser[]> {
  const organizationId = session.session.activeOrganizationId;

  const users = organizationId
    ? await db
        .select({
          id: user.id,
          firstname: user.firstname,
          lastname: user.lastname,
          avatar: user.image,
        })
        .from(user)
        .innerJoin(member, eq(member.userId, user.id))
        .where(eq(member.organizationId, organizationId))
    : await db
        .select({
          id: user.id,
          firstname: user.firstname,
          lastname: user.lastname,
          avatar: user.image,
        })
        .from(user)
        .where(eq(user.id, session.user.id));

  return users.map((u) => ({
    id: u.id,
    firstname: u.firstname,
    lastname: u.lastname,
    name: formatUserName(u.firstname, u.lastname),
    avatar: u.avatar ?? "",
  }));
}
