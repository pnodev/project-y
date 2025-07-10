import { useSuspenseQuery } from "@tanstack/react-query";
import {
  createFileRoute,
  Link,
  Outlet,
  useNavigate,
} from "@tanstack/react-router";
import { FormEvent, useCallback } from "react";

import { useCreateTaskMutation, useUpdateTaskMutation } from "~/db/mutations";
import {
  authStateFn,
  statusesQueryOptions,
  tasksQueryOptions,
} from "~/db/queries";

import { BoardView } from "~/components/views/BoardView";
import { Priority, UpdateTask } from "~/db/schema";

export const Route = createFileRoute("/_signed-in/tasks")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(tasksQueryOptions());
    await context.queryClient.ensureQueryData(statusesQueryOptions());
  },
  beforeLoad: async () => await authStateFn(),
  component: Home,
});

function Home() {
  const tasksQuery = useSuspenseQuery(tasksQueryOptions());
  const statusesQuery = useSuspenseQuery(statusesQueryOptions());
  const createTask = useCreateTaskMutation();
  const updateTask = useUpdateTaskMutation();
  const navigate = useNavigate();

  const handleSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const formData = new FormData(e.currentTarget);
      const name = formData.get("name") as string;
      const description = formData.get("description") as string;
      const statusId = formData.get("statusId") as string;
      e.currentTarget.reset();

      if (!name || !statusId || !description) {
        return;
      }

      await createTask({ name, description, statusId });
    },
    [createTask]
  );

  const handleUpdateTask = useCallback(
    async ({ id, statusId }: UpdateTask) => {
      await updateTask({
        id: id,
        statusId,
      });
    },
    [updateTask]
  );

  const priorityOrder: Priority[] = ["low", "medium", "high", "critical"];

  return (
    <div className="flex flex-col gap-2 h-full grow-0">
      {/* <Link to="/statuses">Statuses</Link>
      <form className="border p-2" onSubmit={handleSubmit}>
        <input type="text" placeholder="Name" name="name" />
        <textarea placeholder="Description" name="description" />
        <select name="statusId">
          <option value="">Select a status</option>
          {[...statusesQuery.data].map((status) => {
            return (
              <option key={status.id} value={status.id}>
                {status.name}
              </option>
            );
          })}
        </select>
        <button type="submit">Create</button>
      </form> */}

      <BoardView
        priorityOrder={priorityOrder}
        tasks={tasksQuery.data}
        statuses={statusesQuery.data}
        updateTask={handleUpdateTask}
        onOpenTask={(task) => navigate({ to: `/tasks/${task.id}` })}
      />

      <Outlet />
    </div>
  );
}
