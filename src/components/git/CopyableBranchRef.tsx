import { Copy } from "lucide-react";
import { cn } from "~/lib/utils";

export function CopyableBranchRef({
  branchRef,
  onCopy,
  className,
}: {
  branchRef: string;
  onCopy: (text: string, label: string) => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      className={cn(
        "group/copyable-branch inline-flex max-w-full min-w-0 items-center gap-0.5 rounded px-1 -mx-1 font-mono text-foreground hover:bg-muted/60",
        className
      )}
      title="Copy branch name"
      aria-label={`Copy branch name ${branchRef}`}
      onClick={() => onCopy(branchRef, "Branch name")}
    >
      <span className="truncate">{branchRef}</span>
      <Copy className="text-muted-foreground size-3 shrink-0 opacity-0 transition-opacity group-hover/copyable-branch:opacity-100" />
    </button>
  );
}
