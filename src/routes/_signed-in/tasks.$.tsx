import { useSuspenseQuery } from "@tanstack/react-query";
import {
  createFileRoute,
  useNavigate,
  useParams,
} from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";

import { useUpdateTaskMutation } from "~/db/mutations/tasks";
import { authStateFn } from "~/db/queries";

import { BoardView } from "~/components/views/BoardView";
import { Priority, UpdateTask } from "~/db/schema";
import { OpenTask } from "~/components/OpenTask";
import { PageLayout } from "~/components/PageLayout";
import { tasksQueryOptions } from "~/db/queries/tasks";
import { statusesQueryOptions } from "~/db/queries/statuses";
import { labelsQueryOptions } from "~/db/queries/labels";

export const Route = createFileRoute("/_signed-in/tasks/$")({
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
  const labelsQuery = useSuspenseQuery(labelsQueryOptions());
  const updateTask = useUpdateTaskMutation();
  const navigate = useNavigate();
  const params = useParams({ from: "/_signed-in/tasks/$" });
  const [openTask, setOpenTask] = useState<string | null>(null);

  useEffect(() => {
    if (params._splat) {
      setOpenTask(params._splat);
    } else {
      setOpenTask(null);
    }
  }, [params]);

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
    <PageLayout title="Tasks">
      <div className="flex flex-col gap-2 h-full grow-0">
        <BoardView
          priorityOrder={priorityOrder}
          tasks={tasksQuery.data}
          statuses={statusesQuery.data}
          updateTask={handleUpdateTask}
          onOpenTask={(task) => navigate({ to: `/tasks/${task.id}` })}
        />
        <OpenTask
          task={tasksQuery.data?.find((task) => task.id === openTask)}
          statuses={statusesQuery.data}
          labels={labelsQuery.data || []}
        />
      </div>
    </PageLayout>
  );
}
