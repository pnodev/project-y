import { createClerkClient } from "@clerk/backend";
import { getAuth } from "@clerk/tanstack-react-start/server";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { getWebRequest } from "@tanstack/react-start/server";
import { db } from "..";
import { getOwningIdentity } from "~/lib/utils";
import { env } from "~/env";

type User = {
  id: string;
  name: string;
  avatar: string;
};

const fetchAllUsers = createServerFn({ method: "GET" }).handler(
  async (): Promise<User[]> => {
    console.info("Fetching users...");
    const clerkClient = createClerkClient({
      secretKey: "sk_test_3ZtybkCYr0GVnQUQDAGSf7ZatmhrsOC03k4cMQ06xU",
    });
    const { data: users } = await clerkClient.users.getUserList();
    return users.map((user) => ({
      id: user.id,
      name: user.fullName || "",
      avatar: user.imageUrl,
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
