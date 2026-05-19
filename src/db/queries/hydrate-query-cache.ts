import type { QueryClient } from "@tanstack/react-query";
import type {
  ProjectBoardBundle,
  SidebarBundle,
  SprintBoardBundle,
  TaskPageBundle,
} from "~/db/queries/bundles";
import { commentsQueryOptions } from "~/db/queries/comments";
import { labelsQueryOptions } from "~/db/queries/labels";
import { projectQueryOptions } from "~/db/queries/projects";
import { projectsQueryOptions } from "~/db/queries/projects";
import { sprintQueryOptions } from "~/db/queries/sprints";
import { sprintsQueryOptions } from "~/db/queries/sprints";
import { statusesQueryOptions } from "~/db/queries/statuses";
import { taskQueryOptions } from "~/db/queries/tasks";
import {
  tasksForSprintQueryOptions,
  tasksQueryOptions,
} from "~/db/queries/tasks";
import { usersQueryOptions } from "~/db/queries/users";

type StatusesCache = NonNullable<
  Awaited<
    ReturnType<NonNullable<ReturnType<typeof statusesQueryOptions>["queryFn"]>>
  >
>;
type LabelsCache = NonNullable<
  Awaited<
    ReturnType<NonNullable<ReturnType<typeof labelsQueryOptions>["queryFn"]>>
  >
>;

export function hydrateProjectBoardCache(
  queryClient: QueryClient,
  projectId: string,
  data: ProjectBoardBundle
) {
  if (data.project) {
    queryClient.setQueryData(
      projectQueryOptions(projectId).queryKey,
      data.project
    );
  }
  queryClient.setQueryData(tasksQueryOptions(projectId).queryKey, data.tasks);
  queryClient.setQueryData(
    statusesQueryOptions().queryKey,
    data.statuses as StatusesCache
  );
  queryClient.setQueryData(usersQueryOptions().queryKey, data.users);
}

export function hydrateSprintBoardCache(
  queryClient: QueryClient,
  sprintId: string,
  data: SprintBoardBundle
) {
  if (data.sprint) {
    queryClient.setQueryData(sprintQueryOptions(sprintId).queryKey, data.sprint);
  }
  queryClient.setQueryData(
    tasksForSprintQueryOptions(sprintId).queryKey,
    data.tasks
  );
  queryClient.setQueryData(
    statusesQueryOptions().queryKey,
    data.statuses as StatusesCache
  );
  queryClient.setQueryData(usersQueryOptions().queryKey, data.users);
}

export function hydrateTaskPageCache(
  queryClient: QueryClient,
  taskId: string,
  data: TaskPageBundle
) {
  queryClient.setQueryData(taskQueryOptions(taskId).queryKey, data.task);
  queryClient.setQueryData(
    commentsQueryOptions(taskId).queryKey,
    data.comments
  );
  queryClient.setQueryData(
    labelsQueryOptions().queryKey,
    data.labels as LabelsCache
  );
  queryClient.setQueryData(
    statusesQueryOptions().queryKey,
    data.statuses as StatusesCache
  );
}

export function hydrateSidebarCache(
  queryClient: QueryClient,
  data: SidebarBundle
) {
  queryClient.setQueryData(projectsQueryOptions().queryKey, data.projects);
  queryClient.setQueryData(sprintsQueryOptions().queryKey, data.sprints);
}
