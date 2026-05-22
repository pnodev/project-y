import { useParams } from "@tanstack/react-router";
import { Outlet } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { createFileRoute } from "@tanstack/react-router";
import { Settings } from "lucide-react";
import { Suspense, useCallback } from "react";
import { EndlessLoadingSpinner } from "~/components/EndlessLoadingSpinner";
import { PageLayout } from "~/components/PageLayout";
import { SprintStatus } from "~/components/SprintStatus";
import { Button } from "~/components/ui/button";
import { TaskViewSortControls } from "~/components/views/TaskViewSortControls";
import { TaskViewSwitcher } from "~/components/views/TaskViewSwitcher";
import { TaskViewsContainer } from "~/components/views/TaskViewsContainer";
import { useUpdateTaskMutation } from "~/db/mutations/tasks";
import { useSprintQuery } from "~/db/queries/sprints";
import { useStatusesQuery } from "~/db/queries/statuses";
import { useLabelsQuery } from "~/db/queries/labels";
import { useTasksForSprintQuery } from "~/db/queries/tasks";
import { fetchSprintBoardBundle } from "~/db/queries/bundles";
import { hydrateSprintBoardCache } from "~/db/queries/hydrate-query-cache";
import { UpdateTask } from "~/db/schema";
import { sprintEditSheetSearch } from "~/lib/form-sheet-search";

export const Route = createFileRoute("/_signed-in/sprints/$sprintId/tasks")({
  loader: async ({ context, params }) => {
    const { sprintId } = params;
    const bundle = await fetchSprintBoardBundle({ data: { sprintId } });
    hydrateSprintBoardCache(context.queryClient, sprintId, bundle);
  },
  component: RouteComponent,
});

function RouteComponent() {
  const params = useParams({ from: Route.id });
  const tasksQuery = useTasksForSprintQuery(params.sprintId);
  const sprintQuery = useSprintQuery(params.sprintId);
  const statusesQuery = useStatusesQuery();
  const labelsQuery = useLabelsQuery();

  const updateTask = useUpdateTaskMutation();

  const handleUpdateTask = useCallback(
    async ({ id, statusId, projectId }: UpdateTask) => {
      await updateTask({
        id,
        statusId,
        projectId,
        sprintId: params.sprintId,
      });
    },
    [updateTask, params.sprintId]
  );

  return (
    <PageLayout
      headerClassName="px-4"
      contentClassName="gap-2 px-4 pb-2"
      title={
        sprintQuery.data?.name ? `${sprintQuery.data.name} - Tasks` : "Tasks"
      }
      actions={
        <div className="flex gap-2">
          {sprintQuery.data ? <SprintStatus sprint={sprintQuery.data} /> : null}
          <TaskViewSortControls />
          <TaskViewSwitcher />
          <Button size="sm" variant="outline" asChild>
            <Link
              {...sprintEditSheetSearch(params.sprintId)}
              title="Sprint settings"
            >
              <Settings />
            </Link>
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-2 h-full grow-0">
        <TaskViewsContainer
          tasks={tasksQuery.data}
          sprintId={params.sprintId}
          statuses={statusesQuery.data}
          labels={labelsQuery.data ?? []}
          location="sprint"
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
