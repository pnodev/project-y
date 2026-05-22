import type { GitStatusRule } from "~/db/schema";
import { extractTaskKeysFromText } from "./task-key";

export type StatusRuleMatch = {
  rule: GitStatusRule;
  taskKey: { prefix: string; number: number };
};

/**
 * Placeholder in commit status rule patterns. Replaced with the literal task key
 * (e.g. PY-12). Use `#?KEY` when the hash is optional: `fixes #PY-12` or `fixes PY-12`.
 */
export const STATUS_RULE_KEY_PLACEHOLDER = "KEY";

/** GitHub-style closing keywords (https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/linking-a-pull-request-to-an-issue). */
export const CLOSING_KEYWORDS =
  "fix|fixes|fixed|close|closes|closed|resolve|resolves|resolved";

/**
 * Shared convention for commit messages and status rules:
 * - Reference tasks as `PY-12` or `#PY-12`
 * - Close/move with `<keyword> #?KEY` (e.g. `fixes #PY-12`, `resolves PY-12`)
 * Patterns are JavaScript regex; matching is case-insensitive. Do not use `(?i)`.
 */
export const COMMIT_STATUS_RULE_CONVENTION = {
  taskReference: "PY-12 or #PY-12",
  closeExample: "fixes #PY-12",
  wipExample: "#PY-12 wip",
  placeholder: STATUS_RULE_KEY_PLACEHOLDER,
} as const;

/** `(?i)` is PCRE-style; JavaScript RegExp uses the `i` flag instead. */
export function normalizeStatusRulePattern(pattern: string): string {
  return pattern.replace(/^\(\?i\)/, "").trim();
}

export function buildRuleRegex(pattern: string, taskKey: string): RegExp {
  const escapedKey = taskKey.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const withKey = normalizeStatusRulePattern(pattern).replaceAll(
    STATUS_RULE_KEY_PLACEHOLDER,
    escapedKey
  );
  return new RegExp(withKey, "i");
}

export function matchStatusRules(
  message: string,
  rules: GitStatusRule[],
  taskKeys: { prefix: string; number: number }[]
): StatusRuleMatch | null {
  const keys =
    taskKeys.length > 0 ? taskKeys : extractTaskKeysFromText(message);

  const sortedRules = [...rules].sort((a, b) => b.priority - a.priority);

  for (const taskKey of keys) {
    const displayKey = `${taskKey.prefix}-${taskKey.number}`;
    for (const rule of sortedRules) {
      let regex: RegExp;
      try {
        regex = buildRuleRegex(rule.pattern, displayKey);
      } catch {
        continue;
      }
      if (regex.test(message)) {
        return { rule, taskKey };
      }
    }
  }

  return null;
}

export const DEFAULT_STATUS_RULE_PATTERNS = {
  /** e.g. fixes #PY-12, resolves PY-12 */
  close: `(?:${CLOSING_KEYWORDS})\\s+#?${STATUS_RULE_KEY_PLACEHOLDER}\\b`,
  /** e.g. #PY-12 wip, PY-12 in progress */
  wip: `#?${STATUS_RULE_KEY_PLACEHOLDER}\\b\\s+(?:wip|in[- ]?progress)`,
} as const;
