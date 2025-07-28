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
    projectId: uuid("project_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updatedAt", { withTimezone: true }).notNull(),
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

export const projects = createTable(
  "project",
  {
    id: uuid("id").primaryKey(),
    name: varchar("name", { length: 256 }).notNull(),
    description: text("description"),
    owner: varchar("owner", { length: 256 }).notNull(),
    logo: varchar("logo", { length: 256 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updatedAt", { withTimezone: true }),
  },
  (example) => [index("project_owner_idx").on(example.owner)]
);

export const comments = createTable(
  "comment",
  {
    id: uuid("id").primaryKey(),
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id),
    owner: varchar("owner", { length: 256 }).notNull(),
    author: varchar("author", { length: 256 }).notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updatedAt", { withTimezone: true }),
  },
  (example) => [index("comment_owner_idx").on(example.owner)]
);

export const attachments = createTable(
  "attachment",
  {
    id: uuid("id").primaryKey(),
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id),
    owner: varchar("owner", { length: 256 }).notNull(),
    name: varchar("name", { length: 256 }).notNull(),
    size: integer("size").notNull(),
    type: varchar("type", { length: 256 }).notNull(),
    uploadedBy: varchar("uploaded_by", { length: 256 }).notNull(),
    providerFileId: varchar("provider_file_id", { length: 256 }).notNull(),
    url: varchar("url", { length: 256 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updatedAt", { withTimezone: true }),
  },
  (example) => [index("attachment_owner_idx").on(example.owner)]
);

export const attachmentRelations = relations(attachments, ({ one }) => ({
  task: one(tasks, {
    fields: [attachments.taskId],
    references: [tasks.id],
  }),
}));

export const commentRelations = relations(comments, ({ one }) => ({
  task: one(tasks, {
    fields: [comments.taskId],
    references: [tasks.id],
  }),
}));

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
  project: one(projects, {
    fields: [tasks.projectId],
    references: [projects.id],
  }),
  attachments: many(attachments),
}));

export const labelRelations = relations(labels, ({ many }) => ({
  labelsToTasks: many(labelsToTasks),
}));

export type Task = typeof tasks.$inferSelect;
export type TaskWithRelations = Task & {
  labels: (typeof labels.$inferSelect)[];
  attachments: (typeof attachments.$inferSelect)[];
  project: Project;
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
  projectId: string;
};

export type Comment = typeof comments.$inferSelect;
export const insertCommentValidator = createInsertSchema(comments, {
  id: (schema) => schema.optional(),
  owner: (schema) => schema.optional(),
});
export type CreateComment = Omit<
  typeof comments.$inferInsert,
  "id" | "createdAt" | "updatedAt" | "owner"
>;
export type UpdateComment = {
  id: string;
  content?: string;
};

export type Attachment = typeof attachments.$inferSelect;
export const insertAttachmentValidator = createInsertSchema(attachments, {
  id: (schema) => schema.optional(),
  owner: (schema) => schema.optional(),
});
export type CreateAttachment = Omit<
  typeof attachments.$inferInsert,
  "id" | "createdAt" | "updatedAt" | "owner"
>;
export type UpdateAttachment = {
  id: string;
  content?: string;
};

export type Project = typeof projects.$inferSelect;
export const insertProjectValidator = createInsertSchema(projects, {
  id: (schema) => schema.optional(),
  owner: (schema) => schema.optional(),
});
export type CreateProject = Omit<
  typeof projects.$inferInsert,
  "id" | "createdAt" | "updatedAt" | "owner"
>;
export type UpdateProject = {
  id: string;
  content?: string;
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
