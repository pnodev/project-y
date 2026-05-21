import { createFileRoute, redirect } from "@tanstack/react-router";
import { FORM_SHEET_CREATE_LINKS } from "~/lib/form-sheet-search";

export const Route = createFileRoute("/_signed-in/sprints/new")({
  beforeLoad: () => {
    throw redirect({
      to: FORM_SHEET_CREATE_LINKS.sprint.to,
      search: FORM_SHEET_CREATE_LINKS.sprint.search,
    });
  },
});
