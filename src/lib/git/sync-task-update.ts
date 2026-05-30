import "@tanstack/react-start/server-only";

import { sync } from "~/db/mutations/sync";

export type GitInvalidateScope =
  | "task"
  | "summaries"
  | "diff"
  | "commits"
  | "pr-comments"
  | "pr-status"
  | "pr-meta";

export type TaskGitSyncPayload = {
  id: string;
  gitInvalidate?: GitInvalidateScope[];
  pullRequestId?: string;
};

export async function syncTaskGitUpdate(
  taskId: string,
  scopes: GitInvalidateScope[],
  options?: { pullRequestId?: string }
) {
  const payload: TaskGitSyncPayload = {
    id: taskId,
    gitInvalidate: scopes,
    pullRequestId: options?.pullRequestId,
  };
  await sync(`task-update-${taskId}`, payload);
}

export function parseTaskGitSyncPayload(data: unknown): TaskGitSyncPayload | null {
  if (data == null) return null;

  let parsed: unknown = data;
  if (typeof data === "string") {
    try {
      parsed = JSON.parse(data);
    } catch {
      return null;
    }
  }

  if (typeof parsed !== "object" || parsed === null) return null;

  const record = parsed as Record<string, unknown>;
  const wrapped =
    record.payload != null && typeof record.payload === "object"
      ? (record.payload as Record<string, unknown>)
      : record;

  const id = wrapped.id;
  if (typeof id !== "string") return null;

  const gitInvalidate = Array.isArray(wrapped.gitInvalidate)
    ? wrapped.gitInvalidate.filter(
        (scope): scope is GitInvalidateScope =>
          typeof scope === "string" &&
          [
            "task",
            "summaries",
            "diff",
            "commits",
            "pr-comments",
            "pr-status",
            "pr-meta",
          ].includes(scope)
      )
    : undefined;

  const pullRequestId =
    typeof wrapped.pullRequestId === "string"
      ? wrapped.pullRequestId
      : undefined;

  return { id, gitInvalidate, pullRequestId };
}
