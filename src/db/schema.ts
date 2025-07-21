// Example model schema from the Drizzle docs
// https://orm.drizzle.team/docs/sql-schema-declaration

import { relations, sql } from "drizzle-orm";
import {
  pgTableCreator,
  uuid,
  index,
  timestamp,
  varchar,
  text,
  integer,
  pgEnum,
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
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updatedAt", { withTimezone: true }),
  }
  // (example) => ({
  //   ownerIndex: index("owner_idx").on(example.owner),
  // })
);

export const statuses = createTable("status", {
  id: uuid("id").primaryKey(),
  name: varchar("name", { length: 256 }).notNull(),
  color: colorsEnum("color").notNull().default("neutral"),
  order: integer("order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }),
});

export const taskRelations = relations(tasks, ({ one }) => ({
  status: one(statuses, {
    fields: [tasks.statusId],
    references: [statuses.id],
  }),
}));

export type Task = typeof tasks.$inferSelect;
export const insertTaskValidator = createInsertSchema(tasks, {
  id: (schema) => schema.optional(),
});
export const updateTaskValidator = createInsertSchema(tasks, {
  name: (schema) => schema.optional(),
  description: (schema) => schema.optional(),
  statusId: (schema) => schema.optional(),
  priority: (schema) => schema.optional(),
  deadline: (schema) => schema.optional(),
});
export type CreateTask = Omit<
  typeof tasks.$inferInsert,
  "id" | "createdAt" | "updatedAt"
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
});
export const updateStatusValidator = createInsertSchema(statuses, {
  id: (schema) => schema.optional(),
});
export const updateMultipleStatusesValidator = updateStatusValidator.array();
export type CreateStatus = Omit<Status, "id" | "createdAt" | "updatedAt">;
export type UpdateStatus = Omit<Status, "createdAt" | "updatedAt">;
