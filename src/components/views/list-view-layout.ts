import type { CSSProperties } from "react";

export const LIST_ROW_X = "px-4";

export type ListColumnFlags = {
  showProject: boolean;
  showSprint: boolean;
};

export function listGridStyle(_flags: ListColumnFlags): CSSProperties {
  return {
    gridTemplateColumns: [
      "auto",
      "minmax(180px, 2fr)",
      "minmax(100px, 1.2fr)",
      "108px",
      "7.5rem",
      "minmax(140px, 1.2fr)",
    ].join(" "),
  };
}

export type ListColumnKey =
  | "select"
  | "title"
  | "labels"
  | "priority"
  | "due"
  | "assignees";

export function listColumnLabels(): { key: ListColumnKey; label: string }[] {
  return [
    { key: "select", label: "" },
    { key: "title", label: "Task" },
    { key: "labels", label: "Labels" },
    { key: "priority", label: "Priority" },
    { key: "due", label: "Due" },
    { key: "assignees", label: "Assignees" },
  ];
}
