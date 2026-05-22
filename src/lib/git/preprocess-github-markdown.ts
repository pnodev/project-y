/** GitHub bots often nest `<details>`; outer height clipping blocks interacting with them. */
export function hasGitHubCollapsibleSections(body: string): boolean {
  return /<details[\s>]/i.test(body);
}

/** Prepare GitHub PR/issue comment bodies for markdown + limited HTML rendering. */
export function preprocessGitHubMarkdown(body: string): string {
  return (
    body
      // Bot metadata (e.g. coderabbit suggestion markers)
      .replace(/<!--[\s\S]*?-->/g, "")
      // GitHub-only fenced blocks → plain code fences for display
      .replace(/```suggestion\n/g, "```\n")
      .replace(/```suggestion\r\n/g, "```\r\n")
      .trim()
  );
}
