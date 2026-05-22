import { createFileRoute, redirect } from "@tanstack/react-router";
import { projectEditSheetSearch } from "~/lib/form-sheet-search";

export const Route = createFileRoute(
  "/_signed-in/projects/$projectId/settings"
)({
  beforeLoad: ({ params }) => {
    throw redirect(projectEditSheetSearch(params.projectId));
  },
});
