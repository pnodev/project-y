import { requireSessionFromRequest } from "~/lib/session";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";

export type AppUser = {
  id: string;
  firstname: string;
  lastname: string;
  name: string;
  avatar: string;
};

const fetchAllUsers = createServerFn({ method: "GET" }).handler(
  async (): Promise<AppUser[]> => {
    const session = await requireSessionFromRequest();
    const { getUsersForSession } = await import("~/db/queries/users.server");
    return getUsersForSession(session);
  },
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
