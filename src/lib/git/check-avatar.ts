import type { GitPullRequestCheck } from "~/lib/git/types";

/** GitHub avatars for well-known check apps when the API omits `app.owner`. */
const FALLBACK_AVATARS = {
  netlify: "https://avatars.githubusercontent.com/u/7892489?v=4&size=64",
  coderabbit: "https://avatars.githubusercontent.com/u/132027554?v=4&size=64",
} as const;

export function resolveCheckAvatarUrl(
  check: GitPullRequestCheck
): string | null {
  if (check.avatarUrl) return check.avatarUrl;

  const hay = `${check.appSlug ?? ""} ${check.name}`.toLowerCase();
  if (hay.includes("netlify")) return FALLBACK_AVATARS.netlify;
  if (hay.includes("coderabbit")) return FALLBACK_AVATARS.coderabbit;
  return null;
}
