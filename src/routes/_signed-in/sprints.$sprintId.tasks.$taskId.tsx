import { createFileRoute, useParams } from "@tanstack/react-router";
import { OpenTask } from "~/components/OpenTask";
import { useCommentsQuery } from "~/db/queries/comments";
import { useLabelsQuery } from "~/db/queries/labels";
import { useStatusesQuery } from "~/db/queries/statuses";
import { useTaskQuery } from "~/db/queries/tasks";
import { fetchTaskPageBundle } from "~/db/queries/bundles";
import { hydrateTaskPageCache } from "~/db/queries/hydrate-query-cache";
import { taskTabSearchSchema } from "~/lib/task-tab-search";

export const Route = createFileRoute(
  "/_signed-in/sprints/$sprintId/tasks/$taskId"
)({
  validateSearch: taskTabSearchSchema,
  loader: async ({ context, params }) => {
    const bundle = await fetchTaskPageBundle({
      data: { taskId: params.taskId },
    });
    hydrateTaskPageCache(context.queryClient, params.taskId, bundle);
  },
  component: RouteComponent,
});

function RouteComponent() {
  const params = useParams({ from: Route.id });
  const taskQuery = useTaskQuery(params.taskId);
  const labelsQuery = useLabelsQuery();
  const commentsQuery = useCommentsQuery(params.taskId);
  const statusesQuery = useStatusesQuery();

  if (!taskQuery.data) {
    return <p>Loading</p>;
  }

  return (
    <OpenTask
      task={taskQuery.data}
      statuses={statusesQuery.data}
      labels={labelsQuery.data || []}
      comments={commentsQuery.data?.map((comment) => ({
        ...comment,
        author: comment.author || "Unknown", // Default author to "Unknown" if null
      }))}
      location="sprint"
    />
  );
}
