import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useParams } from "@tanstack/react-router";
import { OpenTask } from "~/components/OpenTask";
import { commentsQueryOptions } from "~/db/queries/comments";
import { labelsQueryOptions } from "~/db/queries/labels";
import { statusesQueryOptions } from "~/db/queries/statuses";
import { taskQueryOptions } from "~/db/queries/tasks";

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
  const taskQuery = useSuspenseQuery(taskQueryOptions(params.taskId));
  const labelsQuery = useSuspenseQuery(labelsQueryOptions());
  const commentsQuery = useSuspenseQuery(commentsQueryOptions(params.taskId));
  const statusesQuery = useSuspenseQuery(statusesQueryOptions());

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
