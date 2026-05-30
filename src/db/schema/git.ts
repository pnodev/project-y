import { relations, sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { pgTableCreator } from "drizzle-orm/pg-core";

const createTable = pgTableCreator((name) => `project-y_${name}`);

export const gitProviderEnum = pgEnum("git_provider", [
  "github",
  "gitlab",
  "gitlab_self_hosted",
]);
export const GIT_PROVIDER_VALUES = gitProviderEnum.enumValues;
export type GitProviderType = (typeof GIT_PROVIDER_VALUES)[number];

export const gitPrStateEnum = pgEnum("git_pr_state", [
  "open",
  "closed",
  "merged",
  "draft",
]);
export const GIT_PR_STATE_VALUES = gitPrStateEnum.enumValues;
export type GitPrState = (typeof GIT_PR_STATE_VALUES)[number];

export const gitBranchStateEnum = pgEnum("git_branch_state", [
  "active",
  "deleted",
]);
export const GIT_BRANCH_STATE_VALUES = gitBranchStateEnum.enumValues;

export const gitConnections = createTable(
  "git_connection",
  {
    id: uuid("id").primaryKey(),
    owner: varchar("owner", { length: 256 }).notNull(),
    provider: gitProviderEnum("provider").notNull(),
    installationId: varchar("installation_id", { length: 64 }),
    accountLogin: varchar("account_login", { length: 256 }),
    accountType: varchar("account_type", { length: 32 }),
    instanceUrl: varchar("instance_url", { length: 512 }),
    credentials: text("credentials"),
    connectedByUserId: varchar("connected_by_user_id", { length: 256 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (t) => [
    index("git_connection_owner_idx").on(t.owner),
    uniqueIndex("git_connection_owner_provider_install_idx").on(
      t.owner,
      t.provider,
      t.installationId
    ),
  ]
);

export const gitUserLinks = createTable(
  "git_user_link",
  {
    id: uuid("id").primaryKey(),
    userId: varchar("user_id", { length: 256 }).notNull(),
    provider: gitProviderEnum("provider").notNull(),
    providerUserId: varchar("provider_user_id", { length: 256 }).notNull(),
    providerLogin: varchar("provider_login", { length: 256 }),
    accessToken: text("access_token").notNull(),
    refreshToken: text("refresh_token"),
    tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true }),
    scopes: text("scopes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (t) => [
    index("git_user_link_user_idx").on(t.userId),
    uniqueIndex("git_user_link_user_provider_idx").on(t.userId, t.provider),
  ]
);

export const gitRepositories = createTable(
  "git_repository",
  {
    id: uuid("id").primaryKey(),
    connectionId: uuid("connection_id")
      .notNull()
      .references(() => gitConnections.id, { onDelete: "cascade" }),
    owner: varchar("owner", { length: 256 }).notNull(),
    externalId: varchar("external_id", { length: 64 }).notNull(),
    fullName: varchar("full_name", { length: 512 }).notNull(),
    defaultBranch: varchar("default_branch", { length: 256 })
      .notNull()
      .default("main"),
    htmlUrl: varchar("html_url", { length: 512 }).notNull(),
    isArchived: boolean("is_archived").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (t) => [
    index("git_repository_connection_idx").on(t.connectionId),
    index("git_repository_owner_idx").on(t.owner),
    uniqueIndex("git_repository_connection_external_idx").on(
      t.connectionId,
      t.externalId
    ),
  ]
);

export const projectGitRepositories = createTable(
  "project_git_repository",
  {
    projectId: uuid("project_id").notNull(),
    repositoryId: uuid("repository_id")
      .notNull()
      .references(() => gitRepositories.id, { onDelete: "cascade" }),
    owner: varchar("owner", { length: 256 }).notNull(),
    isPrimary: boolean("is_primary").notNull().default(false),
    defaultBaseBranch: varchar("default_base_branch", { length: 256 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.projectId, t.repositoryId] }),
    index("project_git_repository_owner_idx").on(t.owner),
  ]
);

export const taskGitBranches = createTable(
  "task_git_branch",
  {
    id: uuid("id").primaryKey(),
    taskId: uuid("task_id").notNull(),
    repositoryId: uuid("repository_id")
      .notNull()
      .references(() => gitRepositories.id, { onDelete: "cascade" }),
    owner: varchar("owner", { length: 256 }).notNull(),
    ref: varchar("ref", { length: 512 }).notNull(),
    sha: varchar("sha", { length: 64 }),
    state: gitBranchStateEnum("state").notNull().default("active"),
    createdByUserId: varchar("created_by_user_id", { length: 256 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (t) => [
    index("task_git_branch_task_idx").on(t.taskId),
    index("task_git_branch_owner_ref_idx").on(t.owner, t.ref),
    uniqueIndex("task_git_branch_task_repo_active_idx").on(
      t.taskId,
      t.repositoryId
    ),
  ]
);

export const taskGitPullRequests = createTable(
  "task_git_pull_request",
  {
    id: uuid("id").primaryKey(),
    taskId: uuid("task_id").notNull(),
    repositoryId: uuid("repository_id")
      .notNull()
      .references(() => gitRepositories.id, { onDelete: "cascade" }),
    branchId: uuid("branch_id").references(() => taskGitBranches.id, {
      onDelete: "set null",
    }),
    owner: varchar("owner", { length: 256 }).notNull(),
    number: integer("number").notNull(),
    providerPrId: varchar("provider_pr_id", { length: 64 }).notNull(),
    url: varchar("url", { length: 512 }).notNull(),
    title: varchar("title", { length: 512 }).notNull(),
    body: text("body"),
    state: gitPrStateEnum("state").notNull().default("open"),
    headRef: varchar("head_ref", { length: 512 }).notNull(),
    baseRef: varchar("base_ref", { length: 512 }).notNull(),
    checksStatus: varchar("checks_status", { length: 32 }),
    mergedAt: timestamp("merged_at", { withTimezone: true }),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (t) => [
    index("task_git_pr_task_idx").on(t.taskId),
    uniqueIndex("task_git_pr_repo_number_idx").on(t.repositoryId, t.number),
  ]
);

export const taskGitActivity = createTable(
  "task_git_activity",
  {
    id: uuid("id").primaryKey(),
    taskId: uuid("task_id").notNull(),
    owner: varchar("owner", { length: 256 }).notNull(),
    type: varchar("type", { length: 64 }).notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    actorLogin: varchar("actor_login", { length: 256 }),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (t) => [index("task_git_activity_task_idx").on(t.taskId)]
);

export const gitStatusRules = createTable(
  "git_status_rule",
  {
    id: uuid("id").primaryKey(),
    owner: varchar("owner", { length: 256 }).notNull(),
    projectId: uuid("project_id"),
    pattern: text("pattern").notNull(),
    targetStatusId: uuid("target_status_id").notNull(),
    priority: integer("priority").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (t) => [index("git_status_rule_owner_idx").on(t.owner)]
);

export const gitWebhookDeliveries = createTable(
  "git_webhook_delivery",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    provider: gitProviderEnum("provider").notNull(),
    eventType: varchar("event_type", { length: 128 }).notNull(),
    processedAt: timestamp("processed_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (t) => [index("git_webhook_delivery_provider_idx").on(t.provider)]
);

export const gitCommitStatusApplications = createTable(
  "git_commit_status_application",
  {
    deliveryId: varchar("delivery_id", { length: 64 }).notNull(),
    commitSha: varchar("commit_sha", { length: 64 }).notNull(),
    ruleId: uuid("rule_id").notNull(),
    taskId: uuid("task_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.deliveryId, t.commitSha, t.ruleId, t.taskId] }),
  ]
);

export const gitConnectionRelations = relations(gitConnections, ({ many }) => ({
  repositories: many(gitRepositories),
}));

export const gitRepositoryRelations = relations(
  gitRepositories,
  ({ one, many }) => ({
    connection: one(gitConnections, {
      fields: [gitRepositories.connectionId],
      references: [gitConnections.id],
    }),
    projectLinks: many(projectGitRepositories),
  })
);

export const projectGitRepositoryRelations = relations(
  projectGitRepositories,
  ({ one }) => ({
    repository: one(gitRepositories, {
      fields: [projectGitRepositories.repositoryId],
      references: [gitRepositories.id],
    }),
  })
);

export const taskGitBranchRelations = relations(taskGitBranches, ({ one }) => ({
  repository: one(gitRepositories, {
    fields: [taskGitBranches.repositoryId],
    references: [gitRepositories.id],
  }),
}));

export const taskGitPullRequestRelations = relations(
  taskGitPullRequests,
  ({ one }) => ({
    repository: one(gitRepositories, {
      fields: [taskGitPullRequests.repositoryId],
      references: [gitRepositories.id],
    }),
    branch: one(taskGitBranches, {
      fields: [taskGitPullRequests.branchId],
      references: [taskGitBranches.id],
    }),
  })
);

export const insertGitStatusRuleValidator = createInsertSchema(gitStatusRules, {
  id: (s) => s.optional(),
  owner: (s) => s.optional(),
  projectId: (s) => s.nullable().optional(),
  updatedAt: (s) => s.optional(),
  createdAt: (s) => s.optional(),
});

export const updateGitStatusRuleValidator = z.object({
  id: z.string().uuid(),
  pattern: z.string().min(1).optional(),
  targetStatusId: z.string().uuid().optional(),
  priority: z.number().int().optional(),
  projectId: z.string().uuid().nullable().optional(),
});

export type GitConnection = typeof gitConnections.$inferSelect;
export type GitRepository = typeof gitRepositories.$inferSelect;
export type ProjectGitRepository = typeof projectGitRepositories.$inferSelect;
export type TaskGitBranch = typeof taskGitBranches.$inferSelect;
export type TaskGitPullRequest = typeof taskGitPullRequests.$inferSelect;
export type TaskGitActivity = typeof taskGitActivity.$inferSelect;
export type GitStatusRule = typeof gitStatusRules.$inferSelect;
