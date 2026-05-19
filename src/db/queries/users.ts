import { requireSessionFromRequest } from "~/lib/session";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";
import { db } from "~/db";
import { member, user } from "~/db/auth-schema";
import { formatUserName } from "~/lib/utils";

export type AppUser = {
  id: string;
  firstname: string;
  lastname: string;
  name: string;
  avatar: string;
};

type AuthSession = Awaited<
  ReturnType<typeof import("~/lib/auth").auth.api.getSession>
>;

export async function getUsersForSession(
  session: NonNullable<AuthSession>
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

const fetchAllUsers = createServerFn({ method: "GET" }).handler(
  async (): Promise<AppUser[]> => {
    const session = await requireSessionFromRequest();
    return getUsersForSession(session);
  }
);

export const usersQueryOptions = () =>
  queryOptions({
    queryKey: ["users"],
    queryFn: () => fetchAllUsers(),
  });

export const useUsersQuery = () => {
  const queryData = useSuspenseQuery(usersQueryOptions());
  return { ...queryData };
};
