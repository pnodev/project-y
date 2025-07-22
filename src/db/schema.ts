// Example model schema from the Drizzle docs
// https://orm.drizzle.team/docs/sql-schema-declaration

import { relations, sql } from "drizzle-orm";
import {
  pgTableCreator,
  uuid,
  timestamp,
  varchar,
  text,
  integer,
  pgEnum,
  primaryKey,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

/**
 * This is an example of how to use the multi-project schema feature of Drizzle ORM. Use the same
 * database instance for multiple projects.
 *
 * @see https://orm.drizzle.team/docs/goodies#multi-project-schema
 */
export const createTable = pgTableCreator((name) => `project-y_${name}`);

export const colorsEnum = pgEnum("color", [
  "red",
  "orange",
  "yellow",
  "green",
  "emerald",
  "teal",
  "cyan",
  "blue",
  "indigo",
  "violet",
  "purple",
  "fuchsia",
  "pink",
  "rose",
  "neutral",
]);
export const COLOR_VALUES = colorsEnum.enumValues;
export type Color = (typeof colorsEnum.enumValues)[number];

export const priorityEnum = pgEnum("priority", [
  "low",
  "medium",
  "high",
  "critical",
]);
export const PRIORITY_VALUES = priorityEnum.enumValues;
export type Priority = (typeof priorityEnum.enumValues)[number];

export const tasks = createTable(
  "task",
  {
    id: uuid("id").primaryKey(),
    name: varchar("name", { length: 256 }).notNull(),
    description: text("description"),
    statusId: uuid("status_id"),
    priority: priorityEnum("priority").notNull().default("medium"),
    deadline: timestamp("deadline", { withTimezone: true }),
    owner: varchar("owner", { length: 256 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updatedAt", { withTimezone: true }),
  },
  (example) => [index("task_owner_idx").on(example.owner)]
);

export const statuses = createTable(
  "status",
  {
    id: uuid("id").primaryKey(),
    name: varchar("name", { length: 256 }).notNull(),
    color: colorsEnum("color").notNull().default("neutral"),
    order: integer("order").notNull().default(0),
    owner: varchar("owner", { length: 256 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updatedAt", { withTimezone: true }),
  },
  (example) => [index("status_owner_idx").on(example.owner)]
);

export const labels = createTable(
  "label",
  {
    id: uuid("id").primaryKey(),
    name: varchar("name", { length: 256 }).notNull(),
    color: colorsEnum("color").notNull().default("neutral"),
    order: integer("order").notNull().default(0),
    owner: varchar("owner", { length: 256 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updatedAt", { withTimezone: true }),
  },
  (example) => [index("label_owner_idx").on(example.owner)]
);

export const labelsToTasks = createTable(
  "labels_to_tasks",
  {
    labelId: uuid("label_id")
      .notNull()
      .references(() => labels.id),
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id),
  },
  (t) => [primaryKey({ columns: [t.labelId, t.taskId] })]
);

export const labelsToTasksRelations = relations(labelsToTasks, ({ one }) => ({
  task: one(tasks, {
    fields: [labelsToTasks.taskId],
    references: [tasks.id],
  }),
  label: one(labels, {
    fields: [labelsToTasks.labelId],
    references: [labels.id],
  }),
}));

export const taskRelations = relations(tasks, ({ one, many }) => ({
  status: one(statuses, {
    fields: [tasks.statusId],
    references: [statuses.id],
  }),
  labelsToTasks: many(labelsToTasks),
}));

export const labelRelations = relations(labels, ({ one, many }) => ({
  labelsToTasks: many(labelsToTasks),
}));

export type Task = typeof tasks.$inferSelect;
export type TaskWithLabels = Task & {
  labels: (typeof labels.$inferSelect)[];
};
export const insertTaskValidator = createInsertSchema(tasks, {
  id: (schema) => schema.optional(),
  owner: (schema) => schema.optional(),
});
export const updateTaskValidator = createInsertSchema(tasks, {
  name: (schema) => schema.optional(),
  description: (schema) => schema.optional(),
  statusId: (schema) => schema.optional(),
  priority: (schema) => schema.optional(),
  deadline: (schema) => schema.optional(),
  owner: (schema) => schema.optional(),
});
export type CreateTask = Omit<
  typeof tasks.$inferInsert,
  "id" | "createdAt" | "updatedAt" | "owner"
>;
export type UpdateTask = {
  id: string;
  name?: string;
  description?: string;
  statusId?: string;
  priority?: "low" | "medium" | "high" | "critical";
  deadline?: Date;
};

export type Status = typeof statuses.$inferInsert;
export const insertStatusValidator = createInsertSchema(statuses, {
  id: (schema) => schema.optional(),
  owner: (schema) => schema.optional(),
});
export const updateStatusValidator = createInsertSchema(statuses, {
  id: (schema) => schema.optional(),
  owner: (schema) => schema.optional(),
});
export const updateMultipleStatusesValidator = updateStatusValidator.array();
export type CreateStatus = Omit<
  Status,
  "id" | "createdAt" | "updatedAt" | "owner"
>;
export type UpdateStatus = Omit<Status, "createdAt" | "updatedAt" | "owner">;

export type Label = typeof labels.$inferInsert;
export const insertLabelValidator = createInsertSchema(labels, {
  id: (schema) => schema.optional(),
  owner: (schema) => schema.optional(),
});
export const updateLabelValidator = createInsertSchema(labels, {
  id: (schema) => schema.optional(),
  owner: (schema) => schema.optional(),
});
export const updateMultipleLabelsValidator = updateLabelValidator.array();
export type CreateLabel = Omit<
  Label,
  "id" | "createdAt" | "updatedAt" | "owner"
>;
export type UpdateLabel = Omit<Label, "createdAt" | "updatedAt" | "owner">;
