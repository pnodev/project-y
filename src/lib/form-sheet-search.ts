import { z } from "zod";

export const formSheetSearchSchema = z.object({
  sheet: z
    .enum([
      "create-project",
      "create-sprint",
      "create-organization",
      "create-label",
      "create-status",
      "edit-project",
      "edit-sprint",
    ])
    .optional(),
});

/** Query params set by /api/git/github/callback after install or user OAuth. */
export const gitIntegrationCallbackSearchSchema = z.object({
  installed: z.enum(["success", "error"]).optional().catch(undefined),
  user: z.enum(["connected", "error"]).optional().catch(undefined),
  error: z.string().max(200).optional().catch(undefined),
});

/** Parent layout search: form sheets + GitHub integration callback flags. */
export const signedInSearchSchema = formSheetSearchSchema.extend(
  gitIntegrationCallbackSearchSchema.shape
);

export type FormSheetSearch = z.infer<typeof formSheetSearchSchema>;

export type FormSheetCreateSearch = NonNullable<FormSheetSearch["sheet"]>;

export function isFormSheetNavItemActive(
  pathname: string,
  url: string,
  itemSearch: FormSheetSearch | undefined,
  routeSearch: FormSheetSearch
) {
  if (url === "#") return false;
  const pathMatches =
    pathname === url || (url !== "/dashboard" && pathname.startsWith(`${url}/`));
  if (!pathMatches) return false;
  if (itemSearch?.sheet != null) {
    return routeSearch.sheet === itemSearch.sheet;
  }
  if (url === "/dashboard" && routeSearch.sheet != null) {
    return false;
  }
  return true;
}

export const FORM_SHEET_CREATE_LINKS = {
  project: {
    to: "/dashboard" as const,
    search: { sheet: "create-project" } satisfies FormSheetSearch,
  },
  sprint: {
    to: "/dashboard" as const,
    search: { sheet: "create-sprint" } satisfies FormSheetSearch,
  },
  organization: {
    to: "/settings/organization" as const,
    search: { sheet: "create-organization" } satisfies FormSheetSearch,
  },
  label: {
    to: "/labels" as const,
    search: { sheet: "create-label" } satisfies FormSheetSearch,
  },
  status: {
    to: "/statuses" as const,
    search: { sheet: "create-status" } satisfies FormSheetSearch,
  },
};

export function projectEditSheetSearch(projectId: string) {
  return {
    to: "/projects/$projectId/tasks" as const,
    params: { projectId },
    search: { sheet: "edit-project" } satisfies FormSheetSearch,
  };
}

export function sprintEditSheetSearch(sprintId: string) {
  return {
    to: "/sprints/$sprintId/tasks" as const,
    params: { sprintId },
    search: { sheet: "edit-sprint" } satisfies FormSheetSearch,
  };
}
