import { requireSession } from "~/lib/auth-functions";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { db } from "~/db";
import { user } from "~/db/auth-schema";
import { formatUserName } from "~/lib/utils";

export type AppUser = {
  id: string;
  firstname: string;
  lastname: string;
  name: string;
  avatar: string;
};

const fetchAllUsers = createServerFn({ method: "GET" }).handler(
  async (): Promise<AppUser[]> => {
    await requireSession();

    const users = await db
      .select({
        id: user.id,
        firstname: user.firstname,
        lastname: user.lastname,
        avatar: user.image,
      })
      .from(user);

    return users.map((u) => ({
      id: u.id,
      firstname: u.firstname,
      lastname: u.lastname,
      name: formatUserName(u.firstname, u.lastname),
      avatar: u.avatar ?? "",
    }));
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
