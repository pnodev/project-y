import {
  ADDRESSED_FINDING_STATUS_RE,
  isBotReviewDigest,
} from "~/lib/git/bot-review-comment-summary";

/** GitHub bots often nest `<details>`; outer height clipping blocks interacting with them. */
export function hasGitHubCollapsibleSections(body: string): boolean {
  return /<details[\s>]/i.test(body);
}

/** Per-file finding header in CodeRabbit digests, e.g. `\n`@src/foo.ts:12` */
const FINDING_PATH_HEADER_RE = /(?:^|\n)`@[^`\n]+`/;

const FINDING_BLOCK_SPLIT_RE = /(?=\n`@[^`\n]+`)/;

function isAddressedFindingBlock(segment: string): boolean {
  return (
    FINDING_PATH_HEADER_RE.test(segment) &&
    ADDRESSED_FINDING_STATUS_RE.test(segment)
  );
}

function addressedSummaryLine(segment: string): string {
  const match = segment.match(ADDRESSED_FINDING_STATUS_RE);
  return match?.[0]?.trim() ?? "✅ Addressed — show details";
}

function wrapAddressedSegment(segment: string): string {
  const summary = addressedSummaryLine(segment);
  return `<details class="gh-bot-finding-addressed">\n<summary>${summary}</summary>\n\n${segment.trim()}\n</details>`;
}

/** Wrap CodeRabbit finding blocks that are already marked addressed (collapsed by default). */
export function collapseAddressedBotFindings(body: string): string {
  if (!isBotReviewDigest(body)) return body;

  const blocks = body.split(FINDING_BLOCK_SPLIT_RE);
  if (blocks.length <= 1) {
    return body;
  }

  return blocks
    .map((block, index) => {
      if (index === 0) return block;
      return isAddressedFindingBlock(block)
        ? wrapAddressedSegment(block)
        : block;
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
