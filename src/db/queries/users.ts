import { clerkClient } from "@clerk/tanstack-react-start/server";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";

type User = {
  id: string;
  name: string;
  avatar: string;
};

const fetchAllUsers = createServerFn({ method: "GET" }).handler(
  async (): Promise<User[]> => {
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
