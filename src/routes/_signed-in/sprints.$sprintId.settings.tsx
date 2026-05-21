import { createFileRoute, redirect } from "@tanstack/react-router";
import { sprintEditSheetSearch } from "~/lib/form-sheet-search";

export const Route = createFileRoute("/_signed-in/sprints/$sprintId/settings")({
  beforeLoad: ({ params }) => {
    throw redirect(sprintEditSheetSearch(params.sprintId));
  },
});
