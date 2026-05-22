/**
 * Computes GitHub's deprecated but still required `position` index for a line
 * in a unified diff patch (lines after the first @@ hunk header, 1-based).
 */
export function computeDiffPosition(
  patch: string,
  line: number,
  side: "LEFT" | "RIGHT"
): number | null {
  let position = 0;
  let newLine = 0;
  let oldLine = 0;

  for (const raw of patch.split("\n")) {
    if (raw.startsWith("@@")) {
      const match = raw.match(/@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
      if (match) {
        oldLine = parseInt(match[1], 10);
        newLine = parseInt(match[2], 10);
      }
      continue;
    }

    position += 1;

    if (raw.startsWith("+")) {
      if (side === "RIGHT" && newLine === line) return position;
      newLine += 1;
    } else if (raw.startsWith("-")) {
      if (side === "LEFT" && oldLine === line) return position;
      oldLine += 1;
    } else if (raw.startsWith(" ")) {
      if (side === "RIGHT" && newLine === line) return position;
      if (side === "LEFT" && oldLine === line) return position;
      newLine += 1;
      oldLine += 1;
    }
  }

  return null;
}
