import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { FormEvent, useCallback } from "react";

import { useCreateTaskMutation, useUpdateTaskMutation } from "~/db/mutations";
import {
  authStateFn,
  statusesQueryOptions,
  tasksQueryOptions,
} from "~/db/queries";
import { DndContext, DragEndEvent } from "@dnd-kit/core";
import TaskCard from "~/components/TaskCard";
import TaskColumn from "~/components/TaskColumn";

export const Route = createFileRoute("/_pathlessLayout/")({
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

  const handleDrop = useCallback(
    async (e: DragEndEvent) => {
      const taskId = (e.active.id as string).split(":")[1];
      const statusId = (e.over?.id as string).split(":")[1];
      await updateTask({
        id: taskId,
        statusId,
      });
    },
    [createTask]
  );

  return (
    <div className="flex flex-col gap-2 h-full grow-0">
      <Link to="/statuses">Statuses</Link>
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
      </form>

      <DndContext onDragEnd={handleDrop}>
        <div className="flex overflow-x-auto gap-3 h-full grow">
          {[...statusesQuery.data].map((status) => {
            return (
              <TaskColumn key={status.id} status={status}>
                {[...tasksQuery.data]
                  .filter((task) => task.statusId === status.id)
                  .map((task) => {
                    return <TaskCard key={task.id} task={task} />;
                  })}
              </TaskColumn>
            );
          })}
        </div>
      </DndContext>
    </div>
  );
}
