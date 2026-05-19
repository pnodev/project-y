import { createServerFn } from "@tanstack/react-start";
import { asc } from "drizzle-orm";
import { db } from "~/db";
import type { CommentWithAuthor } from "~/db/queries/comments";
import { getCommentsForTask } from "~/db/queries/comments";
import type { AppUser } from "~/db/queries/users";
import { getUsersForSession } from "~/db/queries/users";
import type { Label, Project, Sprint, Status, TaskWithRelations } from "~/db/schema";
import { requireSessionFromRequest } from "~/lib/session";
import { getOwningIdentity } from "~/lib/utils";

export type ProjectBoardBundle = {
  project?: Project;
  tasks: TaskWithRelations[];
  statuses: Status[];
  users: AppUser[];
};

export type SprintBoardBundle = {
  sprint: Sprint | null | undefined;
  tasks: TaskWithRelations[];
  statuses: Status[];
  users: AppUser[];
};

export type TaskPageBundle = {
  task: TaskWithRelations | null;
  comments: CommentWithAuthor[];
  labels: Label[];
  statuses: Status[];
};

export type SidebarBundle = {
  projects: Project[];
  sprints: Sprint[];
};
import {
  boardTaskRelationsForProject,
  boardTaskRelationsForSprint,
  type BoardTaskRow,
  mapBoardTasks,
  mapTaskWithRelations,
} from "./tasks";

export const fetchProjectBoardBundle = createServerFn({ method: "GET" })
  .inputValidator((d: { projectId: string }) => d)
  .handler(
    async ({
      data: { projectId },
    }): Promise<ProjectBoardBundle> => {
      const session = await requireSessionFromRequest();
      const owner = getOwningIdentity(session);

      const [project, rawTasks, statuses, users] = await Promise.all([
        db.query.projects.findFirst({
          where: (model, { eq, and }) =>
            and(eq(model.id, projectId), eq(model.owner, owner)),
        }),
        db.query.tasks.findMany({
          with: boardTaskRelationsForProject,
          where: (model, { eq, and }) =>
            and(eq(model.owner, owner), eq(model.projectId, projectId)),
        }),
        db.query.statuses.findMany({
          where: (model, { eq }) => eq(model.owner, owner),
          orderBy: (fields, { asc: ascFn }) => [ascFn(fields.order)],
        }),
        getUsersForSession(session),
      ]);

      return {
        project: project ?? undefined,
        tasks: mapBoardTasks(rawTasks as BoardTaskRow[], {
          includeProject: false,
        }),
        statuses: statuses as Status[],
        users,
      };
    }
  );

export const fetchSprintBoardBundle = createServerFn({ method: "GET" })
  .inputValidator((d: { sprintId: string }) => d)
  .handler(
    async ({
      data: { sprintId },
    }): Promise<SprintBoardBundle> => {
      const session = await requireSessionFromRequest();
      const owner = getOwningIdentity(session);

      const [sprint, rawTasks, statuses, users] = await Promise.all([
        db.query.sprints.findFirst({
          where: (model, { eq, and }) =>
            and(eq(model.id, sprintId), eq(model.owner, owner)),
        }),
        db.query.tasks.findMany({
          with: boardTaskRelationsForSprint,
          where: (model, { eq, and }) =>
            and(eq(model.owner, owner), eq(model.sprintId, sprintId)),
        }),
        db.query.statuses.findMany({
          where: (model, { eq }) => eq(model.owner, owner),
          orderBy: (fields, { asc: ascFn }) => [ascFn(fields.order)],
        }),
        getUsersForSession(session),
      ]);

      return {
        sprint,
        tasks: mapBoardTasks(rawTasks, { includeProject: true }),
        statuses: statuses as Status[],
        users,
      };
    }
  );

export const fetchTaskPageBundle = createServerFn({ method: "GET" })
  .inputValidator((d: { taskId: string }) => d)
  .handler(
    async ({
      data: { taskId },
    }): Promise<TaskPageBundle> => {
      const session = await requireSessionFromRequest();
      const owner = getOwningIdentity(session);

      const [taskRow, comments, labels, statuses] = await Promise.all([
        db.query.tasks.findFirst({
          where(fields, operators) {
            return operators.and(
              operators.eq(fields.id, taskId),
              operators.eq(fields.owner, owner)
            );
          },
          with: {
            status: true,
            labelsToTasks: {
              with: {
                label: true,
              },
            },
            attachments: true,
            project: true,
            assignees: true,
            subTasks: {
              with: {
                assignees: true,
              },
            },
            sprint: true,
          },
        }),
        getCommentsForTask(owner, taskId),
        db.query.labels.findMany({
          where: (model, { eq: eqFn }) => eqFn(model.owner, owner),
          orderBy: (fields) => [asc(fields.order)],
        }),
        db.query.statuses.findMany({
          where: (model, { eq: eqFn }) => eqFn(model.owner, owner),
          orderBy: (fields, { asc: ascFn }) => [ascFn(fields.order)],
        }),
      ]);

      return {
        task: taskRow ? mapTaskWithRelations(taskRow) : null,
        comments,
        labels: labels as Label[],
        statuses: statuses as Status[],
      };
    }
  );

export const fetchSidebarBundle = createServerFn({ method: "GET" }).handler(
  async (): Promise<SidebarBundle> => {
    const session = await requireSessionFromRequest();
    const owner = getOwningIdentity(session);

    const [projects, sprints] = await Promise.all([
      db.query.projects.findMany({
        where: (model, { eq }) => eq(model.owner, owner),
      }),
      db.query.sprints.findMany({
        where: (model, { eq }) => eq(model.owner, owner),
        orderBy: (fields, { asc: ascFn }) => [ascFn(fields.createdAt)],
      }),
    ]);

    return { projects, sprints };
  }
);
