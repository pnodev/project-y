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
  uniqueIndex,
  boolean,
  jsonb,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

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
    number: integer("number").notNull(),
    name: varchar("name", { length: 256 }).notNull(),
    description: text("description"),
    statusId: uuid("status_id"),
    priority: priorityEnum("priority").notNull().default("medium"),
    deadline: timestamp("deadline", { withTimezone: true }),
    owner: varchar("owner", { length: 256 }).notNull(),
    projectId: uuid("project_id").notNull(),
    sprintId: uuid("sprint_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (example) => [
    index("task_owner_idx").on(example.owner),
    index("task_owner_project_idx").on(example.owner, example.projectId),
    index("task_owner_sprint_idx").on(example.owner, example.sprintId),
    uniqueIndex("task_owner_project_number_idx").on(
      example.owner,
      example.projectId,
      example.number
    ),
  ]
);

export const taskAssignees = createTable(
  "task_assignees",
  {
    id: uuid("id").primaryKey(),
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    owner: varchar("owner", { length: 256 }).notNull(),
    userId: varchar("user_id", { length: 256 }).notNull(),
    assignedAt: timestamp("assigned_at").defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (example) => [index("task_assignees_owner_idx").on(example.owner)]
);

export const subTasks = createTable(
  "sub_task",
  {
    id: uuid("id").primaryKey(),
    description: text("description"),
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    done: boolean("done").notNull().default(false),
    owner: varchar("owner", { length: 256 }).notNull(),
    projectId: uuid("project_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (example) => [index("subtask_owner_idx").on(example.owner)]
);

export const subTaskAssignees = createTable(
  "sub_task_assignees",
  {
    id: uuid("id").primaryKey(),
    subTaskId: uuid("sub_task_id")
      .notNull()
      .references(() => subTasks.id, { onDelete: "cascade" }),
    owner: varchar("owner", { length: 256 }).notNull(),
    userId: varchar("user_id", { length: 256 }).notNull(),
    assignedAt: timestamp("assigned_at").defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (example) => [index("sub_task_assignees_owner_idx").on(example.owner)]
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
    updatedAt: timestamp("updated_at", { withTimezone: true }),
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
    updatedAt: timestamp("updated_at", { withTimezone: true }),
  },
  (example) => [index("label_owner_idx").on(example.owner)]
);

export const projects = createTable(
  "project",
  {
    id: uuid("id").primaryKey(),
    name: varchar("name", { length: 256 }).notNull(),
    description: text("description"),
    taskKeyPrefix: varchar("task_key_prefix", { length: 16 }),
    nextTaskNumber: integer("next_task_number").notNull().default(1),
    owner: varchar("owner", { length: 256 }).notNull(),
    logo: varchar("logo", { length: 256 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
  },
  (example) => [
    index("project_owner_idx").on(example.owner),
    uniqueIndex("project_owner_task_key_prefix_idx").on(
      example.owner,
      example.taskKeyPrefix
    ),
  ]
);

export const comments = createTable(
  "comment",
  {
    id: uuid("id").primaryKey(),
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    owner: varchar("owner", { length: 256 }).notNull(),
    author: varchar("author", { length: 256 }).notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
  },
  (example) => [
    index("comment_owner_idx").on(example.owner),
    index("comment_task_owner_idx").on(example.taskId, example.owner),
  ]
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
    updatedAt: timestamp("updated_at", { withTimezone: true }),
  },
  (example) => [index("attachment_owner_idx").on(example.owner)]
);

export const sprints = createTable(
  "sprint",
  {
    id: uuid("id").primaryKey(),
    name: varchar("name", { length: 256 }).notNull(),
    start: timestamp("start", { withTimezone: true }).notNull(),
    end: timestamp("end", { withTimezone: true }).notNull(),
    owner: varchar("owner", { length: 256 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
  },
  (example) => [index("sprint_owner_idx").on(example.owner)]
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

export const TASK_VIEW_MODES = ["board", "list"] as const;
export type TaskViewMode = (typeof TASK_VIEW_MODES)[number];

export const userPreferencesSchema = z.object({
  taskViewMode: z.enum(TASK_VIEW_MODES).default("board"),
});
export type UserPreferences = z.infer<typeof userPreferencesSchema>;

export const updateUserPreferencesValidator = userPreferencesSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one preference must be provided",
  });

export const userPreferences = createTable("user_preferences", {
  userId: text("user_id").primaryKey(),
  preferences: jsonb("preferences")
    .$type<UserPreferences>()
    .notNull()
    .default({ taskViewMode: "board" }),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

export const labelsToTasks = createTable(
  "labels_to_tasks",
  {
    labelId: uuid("label_id")
      .notNull()
      .references(() => labels.id),
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
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
  assignees: many(taskAssignees),
  subTasks: many(subTasks),
  sprint: one(sprints, {
    fields: [tasks.sprintId],
    references: [sprints.id],
  }),
}));

export const taskAssigneesRelations = relations(taskAssignees, ({ one }) => ({
  task: one(tasks, {
    fields: [taskAssignees.taskId],
    references: [tasks.id],
  }),
}));

export const subTaskAssigneesRelations = relations(
  subTaskAssignees,
  ({ one }) => ({
    subTask: one(subTasks, {
      fields: [subTaskAssignees.subTaskId],
      references: [subTasks.id],
    }),
  })
);

export const subTaskRelations = relations(subTasks, ({ one, many }) => ({
  task: one(tasks, {
    fields: [subTasks.taskId],
    references: [tasks.id],
  }),
  assignees: many(subTaskAssignees),
}));

export const labelRelations = relations(labels, ({ many }) => ({
  labelsToTasks: many(labelsToTasks),
}));

export type Task = typeof tasks.$inferSelect;
export type TaskWithRelations = Task & {
  labels: (typeof labels.$inferSelect)[];
  attachments: (typeof attachments.$inferSelect)[];
  project: Project;
  sprint: Sprint | null;
  assignees: (typeof taskAssignees.$inferSelect)[];
  subTasks: SubTask[];
};
export const insertTaskValidator = createInsertSchema(tasks, {
  id: (schema) => schema.optional(),
  owner: (schema) => schema.optional(),
  number: (schema) => schema.optional(),
});
/** Partial task updates; dates are coerced because RPC serializes them as strings. */
export const updateTaskValidator = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(256).optional(),
  description: z.string().nullable().optional(),
  statusId: z.string().uuid().nullable().optional(),
  priority: z.enum(PRIORITY_VALUES).optional(),
  deadline: z.coerce.date().nullable().optional(),
  projectId: z.string().uuid().optional(),
  sprintId: z.string().uuid().nullable().optional(),
});
export type CreateTask = Omit<
  typeof tasks.$inferInsert,
  "id" | "createdAt" | "updatedAt" | "owner" | "number"
>;
export type UpdateTask = z.infer<typeof updateTaskValidator>;

export type SubTask = typeof subTasks.$inferSelect & {
  assignees: (typeof subTaskAssignees.$inferSelect)[];
};
export const insertSubTaskValidator = createInsertSchema(subTasks, {
  id: (schema) => schema.optional(),
  owner: (schema) => schema.optional(),
  updatedAt: (schema) => schema.optional(),
});
export const updateSubTaskValidator = createInsertSchema(subTasks, {
  id: (schema) => schema.optional(),
  owner: (schema) => schema.optional(),
  done: (schema) => schema.optional(),
  taskId: (schema) => schema.optional(),
  projectId: (schema) => schema.optional(),
  updatedAt: (schema) => schema.optional(),
});
export type CreateSubTask = Omit<
  typeof subTasks.$inferInsert,
  "id" | "createdAt" | "updatedAt" | "owner"
>;
export type UpdateSubTask = {
  id: string;
  description?: string;
  taskId: string;
  done?: boolean;
  projectId: string;
  owner?: string;
  updatedAt?: Date;
};

export const assignTaskValidator = createInsertSchema(taskAssignees, {
  id: (schema) => schema.optional(),
  owner: (schema) => schema.optional(),
  assignedAt: (schema) => schema.optional(),
  updatedAt: (schema) => schema.optional(),
});
export type AssignTask = Omit<
  typeof taskAssignees.$inferInsert,
  "id" | "createdAt" | "updatedAt" | "owner"
>;

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

export type Sprint = typeof sprints.$inferSelect;
export const insertSprintValidator = createInsertSchema(sprints, {
  id: (schema) => schema.optional(),
  owner: (schema) => schema.optional(),
});
export const updateSprintValidator = createInsertSchema(sprints, {
  owner: (schema) => schema.optional(),
  name: (schema) => schema.optional(),
  start: (schema) => schema.optional(),
  end: (schema) => schema.optional(),
});
export type CreateSprint = Omit<
  typeof sprints.$inferInsert,
  "id" | "createdAt" | "updatedAt" | "owner"
>;
export type UpdateSprint = {
  id: string;
  content?: string;
};

export type Project = typeof projects.$inferSelect;
export const insertProjectValidator = createInsertSchema(projects, {
  id: (schema) => schema.optional(),
  owner: (schema) => schema.optional(),
});
export const updateProjectValidator = createInsertSchema(projects, {
  owner: (schema) => schema.optional(),
  name: (schema) => schema.optional(),
  description: (schema) => schema.optional(),
  logo: (schema) => schema.optional(),
  taskKeyPrefix: (schema) => schema.optional(),
  nextTaskNumber: (schema) => schema.optional(),
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

export * from "./schema/git";
