import { useState, type ReactNode } from "react";
import { CheckCircle2, ChevronDown } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/components/ui/collapsible";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

function hiddenCommentsLabel(count: number, authorLogin?: string | null): string {
  const hidden =
    count <= 1 ? "1 comment hidden" : `${count} comments hidden`;
  if (authorLogin) {
    return `${hidden} · ${authorLogin} marked this conversation as resolved`;
  }
  return `${hidden} · Marked as resolved`;
}

export function ReviewThreadResolvedShell({
  resolved,
  commentCount,
  children,
  canResolve = false,
  resolveLoading = false,
  onToggleResolved,
  authorLogin = null,
  variant = "feed",
  className,
}: {
  resolved: boolean;
  commentCount: number;
  children: ReactNode;
  authorLogin?: string | null;
  canResolve?: boolean;
  resolveLoading?: boolean;
  onToggleResolved?: () => void;
  /** `diff` uses Pierre-adjacent colors; `feed` uses app theme tokens. */
  variant?: "diff" | "feed";
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  if (!resolved) {
    return <div className={className}>{children}</div>;
  }

  const bannerClass =
    variant === "diff"
      ? cn(
          "border-green-700/35 bg-green-950/40 text-green-100",
          "dark:border-green-500/30 dark:bg-green-950/60"
        )
      : cn(
          "border-green-600/25 bg-green-50 text-green-950",
          "dark:border-green-500/20 dark:bg-green-950/45 dark:text-green-50"
        );

  const unresolveClass =
    variant === "diff"
      ? "text-green-300 hover:text-green-100"
      : "text-green-800 hover:text-green-950 dark:text-green-300 dark:hover:text-green-50";

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className={cn(
        "min-w-0",
        variant === "diff" && "font-sans antialiased",
        className
      )}
    >
      <div
        className={cn(
          "flex items-center gap-2 rounded-md border px-2.5 py-2",
          bannerClass
        )}
      >
        <CheckCircle2
          className={cn(
            "size-4 shrink-0",
            variant === "diff"
              ? "fill-green-500 text-green-950"
              : "fill-green-600 text-white dark:fill-green-500 dark:text-green-950"
          )}
          aria-hidden
        />
        <CollapsibleTrigger
          className={cn(
            "flex min-w-0 flex-1 cursor-pointer items-center gap-1 text-left text-xs font-medium leading-snug",
            variant === "diff"
              ? "text-green-100 hover:text-white"
              : "text-green-900 hover:text-green-950 dark:text-green-100 dark:hover:text-white"
          )}
        >
          <ChevronDown
            className={cn(
              "size-3.5 shrink-0 transition-transform",
              open && "rotate-180"
            )}
          />
          <span className="min-w-0 text-pretty">
            {hiddenCommentsLabel(commentCount, authorLogin)}
          </span>
        </CollapsibleTrigger>
        {canResolve && onToggleResolved ? (
          <Button
            type="button"
            variant="link"
            size="sm"
            className={cn(
              "h-auto shrink-0 px-1 text-xs font-medium",
              unresolveClass
            )}
            disabled={resolveLoading}
            loading={resolveLoading}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleResolved();
            }}
          >
            Unresolve conversation
          </Button>
        ) : null}
      </div>
      <CollapsibleContent>
        <div
          className={cn(
            "mt-2 space-y-2.5",
            variant === "feed" &&
              "rounded-md border border-border/50 bg-background/60 p-2"
          )}
        >
          {children}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
