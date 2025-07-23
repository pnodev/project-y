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
import { commentsQueryOptions } from "~/db/queries/comments";

export const Route = createFileRoute("/_signed-in/projects/$projectId/tasks/$")(
  {
    loader: async ({ context, params }) => {
      const { projectId } = params;
      await context.queryClient.ensureQueryData(tasksQueryOptions(projectId));
      await context.queryClient.ensureQueryData(statusesQueryOptions());
      await context.queryClient.ensureQueryData(labelsQueryOptions());
      await context.queryClient.ensureQueryData(commentsQueryOptions());
    },
    beforeLoad: async () => await authStateFn(),
    component: Home,
  }
);

function Home() {
  const params = useParams({ from: "/_signed-in/projects/$projectId/tasks/$" });
  const tasksQuery = useSuspenseQuery(tasksQueryOptions(params.projectId));
  const statusesQuery = useSuspenseQuery(statusesQueryOptions());
  const labelsQuery = useSuspenseQuery(labelsQueryOptions());
  const updateTask = useUpdateTaskMutation();
  const navigate = useNavigate();
  const commentsQuery = useSuspenseQuery(commentsQueryOptions(params._splat));
  const [openTask, setOpenTask] = useState<string | null>(null);

  useEffect(() => {
    if (params._splat) {
      setOpenTask(params._splat);
      commentsQuery.refetch();
    } else {
      setOpenTask(null);
    }
  }, [params]);

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
    <PageLayout title="Tasks">
      <div className="flex flex-col gap-2 h-full grow-0">
        <BoardView
          priorityOrder={priorityOrder}
          tasks={tasksQuery.data}
          projectId={params.projectId}
          statuses={statusesQuery.data}
          updateTask={handleUpdateTask}
          onOpenTask={(task) =>
            navigate({ to: `/projects/${params.projectId}/tasks/${task.id}` })
          }
        />
        <OpenTask
          task={tasksQuery.data?.find((task) => task.id === openTask)}
          statuses={statusesQuery.data}
          labels={labelsQuery.data || []}
          comments={commentsQuery.data?.map((comment) => ({
            ...comment,
            author: comment.author || "Unknown", // Default author to "Unknown" if null
          }))}
        />
      </div>
    </PageLayout>
  );
}
