ALTER TABLE "project-y_status" ADD COLUMN "is_closing" boolean DEFAULT false NOT NULL;--> statement-breakpoint
UPDATE "project-y_status" AS s
SET "is_closing" = true
FROM (
  SELECT DISTINCT ON ("owner") "id"
  FROM "project-y_status"
  ORDER BY "owner", "order" DESC, "id" ASC
) AS picked
WHERE s."id" = picked."id";