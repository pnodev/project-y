import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { and, count, eq, isNotNull, isNull, lt } from "drizzle-orm";
import { db } from "~/db";
import { Sprint, tasks } from "~/db/schema";
import { ownerDashboardTopic } from "~/lib/owner-dashboard-topic";
import { useEventSource } from "~/hooks/use-event-source";
import { requireSessionFromRequest } from "~/lib/session";
import { getOwningIdentity } from "~/lib/utils";

export type DashboardStats = {
  owner: string;
  totalTasks: number;
  unassignedTasks: number;
  overdueTasks: number;
  activeSprint: Sprint | null;
  activeSprintTaskCount: number;
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

    const [totalRow, unassignedRow, overdueRow, activeSprintRow] =
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
      ]);

    return {
      owner,
      totalTasks: Number(totalRow[0]?.value ?? 0),
      unassignedTasks: Number(unassignedRow[0]?.value ?? 0),
      overdueTasks: Number(overdueRow[0]?.value ?? 0),
      activeSprint,
      activeSprintTaskCount: Number(activeSprintRow[0]?.value ?? 0),
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
    topics: [ownerDashboardTopic(queryData.data.owner)],
    callback: () => {
      queryData.refetch();
    },
  });

  return { ...queryData };
};
