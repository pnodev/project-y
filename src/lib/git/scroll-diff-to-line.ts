/** Best-effort scroll to a line in a Pierre / unified diff container. */
export function scrollDiffToLine(
  container: HTMLElement | null,
  line: number,
  side: "LEFT" | "RIGHT"
): boolean {
  if (!container) return false;

  const lineText = String(line);

  const rows = container.querySelectorAll("tr");
  for (const row of rows) {
    const cells = row.querySelectorAll("td, th");
    for (const cell of cells) {
      if (cell.textContent?.trim() !== lineText) continue;
      const inDeletion =
        cell.className.includes("deletion") ||
        cell.closest('[class*="deletion"]') != null;
      const inAddition =
        cell.className.includes("addition") ||
        cell.closest('[class*="addition"]') != null;
      if (side === "LEFT" && !inDeletion && inAddition) continue;
      if (side === "RIGHT" && !inAddition && inDeletion) continue;
      row.scrollIntoView({ block: "center", behavior: "smooth" });
      return true;
    }
  }

  for (const el of container.querySelectorAll("td, span, div")) {
    if (el.textContent?.trim() === lineText) {
      el.scrollIntoView({ block: "center", behavior: "smooth" });
      return true;
    }
  }

  return false;
}
