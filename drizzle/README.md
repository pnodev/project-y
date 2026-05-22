# Database migrations

Schema changes are managed with [Drizzle Kit](https://orm.drizzle.team/kit-docs/overview). **Do not hand-write migration files or edit `_journal.json`** — use the CLI so Drizzle keeps snapshots and the journal in sync.

## Day to day

1. Point `NETLIFY_DATABASE_URL` in `.env` at a database whose schema matches the latest applied migration (usually your local Docker Postgres after `pnpm db:switch-local`).
2. Change `src/db/schema.ts` (and related schema files).
3. Generate: `pnpm db:generate --name descriptive_name`
4. Review the generated SQL in `drizzle/`. If a migration must backfill data before `NOT NULL` or unique constraints, adjust the **generated** file (add nullable column → `UPDATE` → `SET NOT NULL`) — do not rewrite the migration from scratch.
5. Apply: `pnpm db:migrate`

## Netlify deploys

Production and preview builds run `pnpm db:migrate` before `pnpm build` (see `netlify.toml`). Ensure `NETLIFY_DATABASE_URL` is set in the Netlify site environment. Preview deploys must use a database whose schema matches the last applied migration (or a branch DB), not production unless you intend to migrate production from previews.

## Existing databases (production / staging)

Use **`pnpm db:migrate`**, not `pnpm db:push`. `db:push` diffs directly against the schema and can fail or drop data on columns like `tasks.number` without a backfill.

- **`0000_baseline`**: no-op for databases that already had the pre–git-integration schema.
- **`0001_git_integration`**: adds git tables, task keys, and backfills `tasks.number`.

## Fresh empty database

Run `pnpm db:migrate` (applies baseline + git integration), or use `pnpm db:push` only when you are sure the database is empty and you accept schema-as-code without migration history.

## Regenerating a baseline (rare)

If you need a new baseline snapshot (e.g. after a major schema reset), use `drizzle.baseline.config.ts` and the copy under `drizzle/baseline-schema/` — see git history for the two-step `generate` flow. This is a one-time setup aid, not part of normal development.
