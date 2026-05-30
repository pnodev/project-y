import { GitBranch, Github } from "lucide-react";
import type { GitProviderType } from "~/db/schema/git";
import { cn } from "~/lib/utils";

export function GitProviderIcon({
  provider,
  className,
}: {
  provider?: GitProviderType | null;
  className?: string;
}) {
  const iconClass = cn("size-5", className);

  if (provider === "github") {
    return <Github className={iconClass} aria-hidden />;
  }

  // gitlab / gitlab_self_hosted: placeholder until GitLab SVG is added
  return <GitBranch className={cn("text-muted-foreground", iconClass)} aria-hidden />;
}
