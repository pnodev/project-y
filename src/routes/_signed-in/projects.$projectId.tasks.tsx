import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Outlet, useParams } from "@tanstack/react-router";
import { Suspense, useCallback } from "react";

import { useUpdateTaskMutation } from "~/db/mutations/tasks";

import { BoardView } from "~/components/views/BoardView";
import { Priority, UpdateTask } from "~/db/schema";
import { PageLayout } from "~/components/PageLayout";
import { tasksQueryOptions } from "~/db/queries/tasks";
import { statusesQueryOptions } from "~/db/queries/statuses";
import { projectQueryOptions } from "~/db/queries/projects";
import { EndlessLoadingSpinner } from "~/components/EndlessLoadingSpinner";

export const Route = createFileRoute("/_signed-in/projects/$projectId/tasks")({
  loader: async ({ context, params }) => {
    const { projectId } = params;
    await context.queryClient.ensureQueryData(projectQueryOptions(projectId));
    await context.queryClient.ensureQueryData(tasksQueryOptions(projectId));
    await context.queryClient.ensureQueryData(statusesQueryOptions());
  },
  component: Home,
});

function Home() {
  const params = useParams({ from: Route.id });
  const tasksQuery = useSuspenseQuery(tasksQueryOptions(params.projectId));
  const projectQuery = useSuspenseQuery(projectQueryOptions(params.projectId));
  const statusesQuery = useSuspenseQuery(statusesQueryOptions());

  const updateTask = useUpdateTaskMutation();

  const handleUpdateTask = useCallback(
    async ({ id, statusId }: UpdateTask) => {
      await updateTask({
        id: id,
        statusId,
        projectId: params.projectId,
      });
    },
    [updateTask]
  );

  const priorityOrder: Priority[] = ["low", "medium", "high", "critical"];

  return (
    <PageLayout
      title={
        projectQuery.data?.name ? `${projectQuery.data.name} - Tasks` : "Tasks"
      }
    >
      <div className="flex flex-col gap-2 h-full grow-0">
        <BoardView
          priorityOrder={priorityOrder}
          tasks={tasksQuery.data}
          projectId={params.projectId}
          statuses={statusesQuery.data}
          updateTask={handleUpdateTask}
        />
        <Suspense
          fallback={
            <div className="flex h-full items-center justify-center">
              <EndlessLoadingSpinner centered />
            </div>
          }
        >
          <Outlet />
        </Suspense>
      </div>
    </PageLayout>
  );
}
