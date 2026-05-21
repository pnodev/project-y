import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { and, count, eq, isNotNull, isNull, lt } from "drizzle-orm";
import { db } from "~/db";
import { Sprint, tasks } from "~/db/schema";
import { useEventSource } from "~/hooks/use-event-source";
import { requireSessionFromRequest } from "~/lib/session";
import { getOwningIdentity } from "~/lib/utils";

export type DashboardStats = {
  totalTasks: number;
  unassignedTasks: number;
  overdueTasks: number;
  activeSprint: Sprint | null;
  activeSprintTaskCount: number;
  /** Used for live-update subscriptions only. */
  taskIds: string[];
  sprintIds: string[];
};

const countTasks = (owner: string, extra?: ReturnType<typeof and>) =>
  db
    .select({ value: count() })
    .from(tasks)
    .where(extra ? and(eq(tasks.owner, owner), extra) : eq(tasks.owner, owner));

export const fetchDashboardStats = createServerFn({ method: "GET" }).handler(
  async (): Promise<DashboardStats> => {
    console.info("Fetching dashboard stats...");
    const session = await requireSessionFromRequest();
    const owner = getOwningIdentity(session);
    const now = new Date();

    const sprints = await db.query.sprints.findMany({
      where: (model, { eq: eqFn }) => eqFn(model.owner, owner),
      orderBy: (fields, { asc }) => [asc(fields.createdAt)],
    });

    const activeSprint =
      sprints.find((s) => s.start < now && s.end > now) ?? null;

    const [totalRow, unassignedRow, overdueRow, activeSprintRow, taskRows] =
      await Promise.all([
        countTasks(owner),
        countTasks(owner, isNull(tasks.statusId)),
        countTasks(
          owner,
          and(isNotNull(tasks.deadline), lt(tasks.deadline, now))
        ),
        activeSprint
          ? countTasks(owner, eq(tasks.sprintId, activeSprint.id))
          : Promise.resolve([{ value: 0 }]),
        db.select({ id: tasks.id }).from(tasks).where(eq(tasks.owner, owner)),
      ]);

    return {
      totalTasks: Number(totalRow[0]?.value ?? 0),
      unassignedTasks: Number(unassignedRow[0]?.value ?? 0),
      overdueTasks: Number(overdueRow[0]?.value ?? 0),
      activeSprint,
      activeSprintTaskCount: Number(activeSprintRow[0]?.value ?? 0),
      taskIds: taskRows.map((row) => row.id),
      sprintIds: sprints.map((s) => s.id),
    };
  }
);

export const dashboardStatsQueryOptions = () =>
  queryOptions({
    queryKey: ["dashboard-stats"],
    queryFn: () => fetchDashboardStats(),
  });

export const useDashboardStatsQuery = () => {
  const queryData = useSuspenseQuery(dashboardStatsQueryOptions());

  useEventSource({
    topics: [
      "task-create",
      "task-delete",
      ...queryData.data.taskIds.map((id) => `task-update-${id}`),
      "sprint-create",
      "sprint-delete",
      ...queryData.data.sprintIds.map((id) => `sprint-update-${id}`),
    ],
    callback: () => {
      queryData.refetch();
    },
  });

  return { ...queryData };
};
