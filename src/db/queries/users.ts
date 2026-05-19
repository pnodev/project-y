import { auth, clerkClient } from "@clerk/tanstack-react-start/server";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { redirect } from "@tanstack/react-router";

type User = {
  id: string;
  name: string;
  avatar: string;
};

const fetchAllUsers = createServerFn({ method: "GET" }).handler(
  async (): Promise<User[]> => {
    const { userId } = await auth();
    if (!userId) {
      throw redirect({ to: "/sign-in/$" });
    }

    console.info("Fetching users...");
    const { data: users } = await clerkClient().users.getUserList();
    return users.map((user) => ({
      id: user.id,
      name: user.fullName || "",
      avatar: user.imageUrl,
    }));
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
