export function formatGitActivityLabel(
  type: string,
  payload: Record<string, string | number | boolean | null>,
  actorLogin?: string | null
): string {
  const actor = actorLogin ? ` · ${actorLogin}` : "";

  switch (type) {
    case "commit": {
      const message = payload.message;
      const text =
        typeof message === "string" && message.length > 0
          ? message.slice(0, 80) + (message.length > 80 ? "…" : "")
          : "Commit pushed";
      return `${text}${actor}`;
    }
    case "branch_created": {
      const ref = payload.ref;
      return typeof ref === "string"
        ? `Branch ${ref} created${actor}`
        : `Branch created${actor}`;
    }
    case "pull_request": {
      const title = payload.title;
      const number = payload.number;
      const state = payload.state;
      const action = payload.action;
      const num = typeof number === "number" ? `#${number}` : "";
      const verb =
        action === "opened"
          ? "opened"
          : action === "reopened"
            ? "reopened"
            : action === "closed" && state === "merged"
              ? "merged"
              : action === "closed"
                ? "closed"
                : "linked";
      const titleText =
        typeof title === "string" && title.length > 0
          ? `: ${title.slice(0, 60)}${title.length > 60 ? "…" : ""}`
          : "";
      return `Pull request ${num} ${verb}${titleText}${actor}`;
    }
    default:
      return `${type.replace(/_/g, " ")}${actor}`;
  }
}
