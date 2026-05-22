import { createFileRoute, redirect } from "@tanstack/react-router";
import { FORM_SHEET_CREATE_LINKS } from "~/lib/form-sheet-search";

export const Route = createFileRoute("/_signed-in/projects/new")({
  beforeLoad: () => {
    throw redirect({
      to: FORM_SHEET_CREATE_LINKS.project.to,
      search: FORM_SHEET_CREATE_LINKS.project.search,
    });
  },
});
