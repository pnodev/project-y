import { isBotReviewDigest } from "~/lib/git/bot-review-comment-summary";

/** GitHub bots often nest `<details>`; outer height clipping blocks interacting with them. */
export function hasGitHubCollapsibleSections(body: string): boolean {
  return /<details[\s>]/i.test(body);
}

const ADDRESSED_SEGMENT_RE = /Addressed in commits?/i;

function isAddressedSegment(segment: string): boolean {
  return ADDRESSED_SEGMENT_RE.test(segment);
}

function addressedSummaryLine(segment: string): string {
  const match = segment.match(/(?:✅\s*)?Addressed in commits?[^\n]*/i);
  return match?.[0]?.trim() ?? "✅ Addressed — show details";
}

function wrapAddressedSegment(segment: string): string {
  const summary = addressedSummaryLine(segment);
  return `<details class="gh-bot-finding-addressed">\n<summary>${summary}</summary>\n\n${segment.trim()}\n</details>`;
}

/** Wrap CodeRabbit finding blocks that are already marked addressed (collapsed by default). */
export function collapseAddressedBotFindings(body: string): string {
  if (!isBotReviewDigest(body)) return body;

  const blocks = body.split(/(?=\n`@)/);
  if (blocks.length <= 1) {
    return isAddressedSegment(body) ? wrapAddressedSegment(body) : body;
  }

  return blocks
    .map((block, index) => {
      if (!isAddressedSegment(block)) return block;
      if (index === 0 && !block.includes("`@")) return block;
      return wrapAddressedSegment(block);
    })
    .join("");
}

/** Prepare GitHub PR/issue comment bodies for markdown + limited HTML rendering. */
export function preprocessGitHubMarkdown(
  body: string,
  options?: { collapseAddressedFindings?: boolean }
): string {
  let result = body
    // Bot metadata (e.g. coderabbit suggestion markers)
    .replace(/<!--[\s\S]*?-->/g, "")
    // GitHub-only fenced blocks → plain code fences for display
    .replace(/```suggestion\n/g, "```\n")
    .replace(/```suggestion\r\n/g, "```\r\n");

  if (options?.collapseAddressedFindings) {
    result = collapseAddressedBotFindings(result);
  }

  return result.trim();
}
