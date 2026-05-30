import { z } from "zod";

export const taskTabValues = ["overview", "development"] as const;
export type TaskTab = (typeof taskTabValues)[number];

export const taskTabSearchSchema = z.object({
  tab: z.enum(taskTabValues).optional().catch(undefined),
});

export type TaskTabSearch = z.infer<typeof taskTabSearchSchema>;

export function getTaskTabFromSearch(search: TaskTabSearch): TaskTab {
  return search.tab ?? "overview";
}
