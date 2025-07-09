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
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

/**
 * This is an example of how to use the multi-project schema feature of Drizzle ORM. Use the same
 * database instance for multiple projects.
 *
 * @see https://orm.drizzle.team/docs/goodies#multi-project-schema
 */
export const createTable = pgTableCreator((name) => `project-y_${name}`);

export const tasks = createTable(
  "task",
  {
    id: uuid("id").primaryKey(),
    name: varchar("name", { length: 256 }).notNull(),
    description: text("description"),
    statusId: uuid("status_id").notNull(),
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

export type Task = typeof tasks.$inferInsert;
export const insertTaskValidator = createInsertSchema(tasks, {
  id: (schema) => schema.optional(),
});
export const updateTaskValidator = createInsertSchema(tasks, {
  name: (schema) => schema.optional(),
  description: (schema) => schema.optional(),
  statusId: (schema) => schema.optional(),
});
export type CreateTask = Omit<Task, "id" | "createdAt" | "updatedAt">;
export type UpdateTask = {
  id: string;
  name?: string;
  description?: string;
  statusId?: string;
};

export type Status = typeof statuses.$inferInsert;
export const insertStatusValidator = createInsertSchema(statuses, {
  id: (schema) => schema.optional(),
});
export const updateStatusValidator = createInsertSchema(statuses, {
  id: (schema) => schema.optional(),
});
export type CreateStatus = Omit<Status, "id" | "createdAt" | "updatedAt">;
export type UpdateStatus = Omit<Status, "createdAt" | "updatedAt">;
