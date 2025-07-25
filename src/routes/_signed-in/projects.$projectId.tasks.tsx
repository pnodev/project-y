import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Outlet, useParams } from "@tanstack/react-router";
import { Suspense, useCallback } from "react";

import { useUpdateTaskMutation } from "~/db/mutations/tasks";

import { BoardView } from "~/components/views/BoardView";
import { Priority, UpdateTask } from "~/db/schema";
import { PageLayout } from "~/components/PageLayout";
import { statusesQueryOptions, useStatusesQuery } from "~/db/queries/statuses";
import { projectQueryOptions, useProjectQuery } from "~/db/queries/projects";
import { EndlessLoadingSpinner } from "~/components/EndlessLoadingSpinner";
import { tasksQueryOptions, useTasksQuery } from "~/db/queries/tasks";

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
  const tasksQuery = useTasksQuery(params.projectId);
  const projectQuery = useProjectQuery(params.projectId);
  const statusesQuery = useStatusesQuery();

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
              <EndlessLoadingSpinner centered isActive={true} />
            </div>
          }
        >
          <Outlet />
        </Suspense>
      </div>
    </PageLayout>
  );
}
