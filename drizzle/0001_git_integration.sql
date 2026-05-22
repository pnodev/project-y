CREATE TYPE "public"."git_branch_state" AS ENUM('active', 'deleted');--> statement-breakpoint
CREATE TYPE "public"."git_pr_state" AS ENUM('open', 'closed', 'merged', 'draft');--> statement-breakpoint
CREATE TYPE "public"."git_provider" AS ENUM('github', 'gitlab', 'gitlab_self_hosted');--> statement-breakpoint
CREATE TABLE "project-y_git_commit_status_application" (
	"delivery_id" varchar(64) NOT NULL,
	"commit_sha" varchar(64) NOT NULL,
	"rule_id" uuid NOT NULL,
	"task_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "project-y_git_commit_status_application_delivery_id_commit_sha_rule_id_task_id_pk" PRIMARY KEY("delivery_id","commit_sha","rule_id","task_id")
);
--> statement-breakpoint
CREATE TABLE "project-y_git_connection" (
	"id" uuid PRIMARY KEY NOT NULL,
	"owner" varchar(256) NOT NULL,
	"provider" "git_provider" NOT NULL,
	"installation_id" varchar(64),
	"account_login" varchar(256),
	"account_type" varchar(32),
	"instance_url" varchar(512),
	"credentials" text,
	"connected_by_user_id" varchar(256),
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project-y_git_repository" (
	"id" uuid PRIMARY KEY NOT NULL,
	"connection_id" uuid NOT NULL,
	"owner" varchar(256) NOT NULL,
	"external_id" varchar(64) NOT NULL,
	"full_name" varchar(512) NOT NULL,
	"default_branch" varchar(256) DEFAULT 'main' NOT NULL,
	"html_url" varchar(512) NOT NULL,
	"is_archived" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project-y_git_status_rule" (
	"id" uuid PRIMARY KEY NOT NULL,
	"owner" varchar(256) NOT NULL,
	"project_id" uuid,
	"pattern" text NOT NULL,
	"target_status_id" uuid NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project-y_git_user_link" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" varchar(256) NOT NULL,
	"provider" "git_provider" NOT NULL,
	"provider_user_id" varchar(256) NOT NULL,
	"provider_login" varchar(256),
	"access_token" text NOT NULL,
	"refresh_token" text,
	"token_expires_at" timestamp with time zone,
	"scopes" text,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project-y_git_webhook_delivery" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"provider" "git_provider" NOT NULL,
	"event_type" varchar(128) NOT NULL,
	"processed_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project-y_project_git_repository" (
	"project_id" uuid NOT NULL,
	"repository_id" uuid NOT NULL,
	"owner" varchar(256) NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"default_base_branch" varchar(256),
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "project-y_project_git_repository_project_id_repository_id_pk" PRIMARY KEY("project_id","repository_id")
);
--> statement-breakpoint
CREATE TABLE "project-y_task_git_activity" (
	"id" uuid PRIMARY KEY NOT NULL,
	"task_id" uuid NOT NULL,
	"owner" varchar(256) NOT NULL,
	"type" varchar(64) NOT NULL,
	"payload" jsonb NOT NULL,
	"actor_login" varchar(256),
	"occurred_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project-y_task_git_branch" (
	"id" uuid PRIMARY KEY NOT NULL,
	"task_id" uuid NOT NULL,
	"repository_id" uuid NOT NULL,
	"owner" varchar(256) NOT NULL,
	"ref" varchar(512) NOT NULL,
	"sha" varchar(64),
	"state" "git_branch_state" DEFAULT 'active' NOT NULL,
	"created_by_user_id" varchar(256),
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project-y_task_git_pull_request" (
	"id" uuid PRIMARY KEY NOT NULL,
	"task_id" uuid NOT NULL,
	"repository_id" uuid NOT NULL,
	"branch_id" uuid,
	"owner" varchar(256) NOT NULL,
	"number" integer NOT NULL,
	"provider_pr_id" varchar(64) NOT NULL,
	"url" varchar(512) NOT NULL,
	"title" varchar(512) NOT NULL,
	"state" "git_pr_state" DEFAULT 'open' NOT NULL,
	"head_ref" varchar(512) NOT NULL,
	"base_ref" varchar(512) NOT NULL,
	"checks_status" varchar(32),
	"merged_at" timestamp with time zone,
	"closed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "project-y_project" ADD COLUMN "task_key_prefix" varchar(16);--> statement-breakpoint
ALTER TABLE "project-y_project" ADD COLUMN "next_task_number" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "project-y_task" ADD COLUMN "number" integer;--> statement-breakpoint
UPDATE "project-y_task" AS t
SET "number" = numbered.rn
FROM (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY owner, project_id
      ORDER BY created_at
    ) AS rn
  FROM "project-y_task"
) AS numbered
WHERE t.id = numbered.id;--> statement-breakpoint
UPDATE "project-y_project" AS p
SET "next_task_number" = COALESCE(
  (
    SELECT MAX(t."number") + 1
    FROM "project-y_task" AS t
    WHERE t.project_id = p.id
      AND t.owner = p.owner
  ),
  1
);--> statement-breakpoint
ALTER TABLE "project-y_task" ALTER COLUMN "number" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "project-y_git_repository" ADD CONSTRAINT "project-y_git_repository_connection_id_project-y_git_connection_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."project-y_git_connection"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project-y_project_git_repository" ADD CONSTRAINT "project-y_project_git_repository_repository_id_project-y_git_repository_id_fk" FOREIGN KEY ("repository_id") REFERENCES "public"."project-y_git_repository"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project-y_task_git_branch" ADD CONSTRAINT "project-y_task_git_branch_repository_id_project-y_git_repository_id_fk" FOREIGN KEY ("repository_id") REFERENCES "public"."project-y_git_repository"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project-y_task_git_pull_request" ADD CONSTRAINT "project-y_task_git_pull_request_repository_id_project-y_git_repository_id_fk" FOREIGN KEY ("repository_id") REFERENCES "public"."project-y_git_repository"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project-y_task_git_pull_request" ADD CONSTRAINT "project-y_task_git_pull_request_branch_id_project-y_task_git_branch_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."project-y_task_git_branch"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "git_connection_owner_idx" ON "project-y_git_connection" USING btree ("owner");--> statement-breakpoint
CREATE UNIQUE INDEX "git_connection_owner_provider_install_idx" ON "project-y_git_connection" USING btree ("owner","provider","installation_id");--> statement-breakpoint
CREATE INDEX "git_repository_connection_idx" ON "project-y_git_repository" USING btree ("connection_id");--> statement-breakpoint
CREATE INDEX "git_repository_owner_idx" ON "project-y_git_repository" USING btree ("owner");--> statement-breakpoint
CREATE UNIQUE INDEX "git_repository_connection_external_idx" ON "project-y_git_repository" USING btree ("connection_id","external_id");--> statement-breakpoint
CREATE INDEX "git_status_rule_owner_idx" ON "project-y_git_status_rule" USING btree ("owner");--> statement-breakpoint
CREATE INDEX "git_user_link_user_idx" ON "project-y_git_user_link" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "git_user_link_user_provider_idx" ON "project-y_git_user_link" USING btree ("user_id","provider");--> statement-breakpoint
CREATE INDEX "git_webhook_delivery_provider_idx" ON "project-y_git_webhook_delivery" USING btree ("provider");--> statement-breakpoint
CREATE INDEX "project_git_repository_owner_idx" ON "project-y_project_git_repository" USING btree ("owner");--> statement-breakpoint
CREATE INDEX "task_git_activity_task_idx" ON "project-y_task_git_activity" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "task_git_branch_task_idx" ON "project-y_task_git_branch" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "task_git_branch_owner_ref_idx" ON "project-y_task_git_branch" USING btree ("owner","ref");--> statement-breakpoint
CREATE UNIQUE INDEX "task_git_branch_task_repo_active_idx" ON "project-y_task_git_branch" USING btree ("task_id","repository_id");--> statement-breakpoint
CREATE INDEX "task_git_pr_task_idx" ON "project-y_task_git_pull_request" USING btree ("task_id");--> statement-breakpoint
CREATE UNIQUE INDEX "task_git_pr_repo_number_idx" ON "project-y_task_git_pull_request" USING btree ("repository_id","number");--> statement-breakpoint
CREATE UNIQUE INDEX "project_owner_task_key_prefix_idx" ON "project-y_project" USING btree ("owner","task_key_prefix");--> statement-breakpoint
CREATE UNIQUE INDEX "task_owner_project_number_idx" ON "project-y_task" USING btree ("owner","project_id","number");