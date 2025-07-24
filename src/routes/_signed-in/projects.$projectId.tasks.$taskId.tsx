import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useParams } from "@tanstack/react-router";
import { OpenTask } from "~/components/OpenTask";
import { commentsQueryOptions, useCommentsQuery } from "~/db/queries/comments";
import { labelsQueryOptions, useLabelsQuery } from "~/db/queries/labels";
import { statusesQueryOptions, useStatusesQuery } from "~/db/queries/statuses";
import { taskQueryOptions, useTaskQuery } from "~/db/queries/tasks";

export const Route = createFileRoute(
  "/_signed-in/projects/$projectId/tasks/$taskId"
)({
  loader: async ({ context, params }) => {
    await context.queryClient.ensureQueryData(taskQueryOptions(params.taskId));
    await context.queryClient.ensureQueryData(labelsQueryOptions());
    await context.queryClient.ensureQueryData(commentsQueryOptions());
    await context.queryClient.ensureQueryData(statusesQueryOptions());
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
    />
  );
}
