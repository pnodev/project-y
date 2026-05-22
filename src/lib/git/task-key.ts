/** Suggest a task key prefix from a project name (e.g. "Project Y" → "PY"). */
export function suggestTaskKeyPrefix(projectName: string): string {
  const words = projectName
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return "TASK";
  if (words.length === 1) {
    const w = words[0].replace(/[^a-zA-Z0-9]/g, "");
    return (w.slice(0, 4) || "TASK").toUpperCase();
  }
  return words
    .map((w) => w[0])
    .join("")
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 6)
    .toUpperCase() || "TASK";
}

export function formatTaskKey(prefix: string | null | undefined, number: number) {
  if (!prefix) return `#${number}`;
  return `${prefix}-${number}`;
}

/** Matches PY-12 and GitHub-style #PY-12 (case-insensitive). */
const TASK_KEY_REGEX = /#?([A-Za-z][A-Za-z0-9]*)-(\d+)\b/gi;

export function extractTaskKeysFromText(text: string): { prefix: string; number: number }[] {
  const results: { prefix: string; number: number }[] = [];
  const seen = new Set<string>();
  for (const match of text.matchAll(TASK_KEY_REGEX)) {
    const prefix = match[1].toUpperCase();
    const number = parseInt(match[2], 10);
    const key = `${prefix}-${number}`;
    if (!seen.has(key)) {
      seen.add(key);
      results.push({ prefix, number });
    }
  }
  return results;
}

export function slugifyForBranch(text: string, maxLength = 40): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maxLength)
    .replace(/-+$/, "");
}

export function defaultBranchName(
  taskKey: string,
  taskName: string
): string {
  const slug = slugifyForBranch(taskName);
  const base = taskKey.toLowerCase();
  return slug ? `${base}-${slug}` : base;
}

/** True when a git branch ref belongs to this task key (e.g. py-42 or py-42-fix-login). */
export function branchMatchesTaskKey(branchRef: string, taskKey: string): boolean {
  const prefix = taskKey.toLowerCase();
  const ref = branchRef.toLowerCase();
  return ref === prefix || ref.startsWith(`${prefix}-`);
}
