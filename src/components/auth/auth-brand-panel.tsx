import { cn } from "~/lib/utils";

type AuthBrandPanelProps = {
  compact?: boolean;
  className?: string;
};

export function AuthBrandPanel({ compact = false, className }: AuthBrandPanelProps) {
  if (compact) {
    return (
      <div
        className={cn(
          "flex items-center gap-3 border-b bg-[var(--brand-navy)] px-6 py-4",
          className
        )}
      >
        <img src="/logo.svg" alt="Project Y" className="size-9 shrink-0" />
        <div className="min-w-0">
          <p className="truncate font-semibold text-white">Project Y</p>
          <p className="truncate text-sm text-white/70">
            Project Management without bullshit.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "auth-brand-pattern w-full bg-[var(--brand-navy)] px-10 py-10 text-white",
        className
      )}
    >
      <div className="flex max-w-sm flex-col gap-6">
        <div className="flex items-center gap-3">
          <img src="/logo.svg" alt="Project Y" className="size-10" />
          <span className="text-lg font-semibold tracking-tight">Project Y</span>
        </div>
        <div className="space-y-4">
          <h1 className="text-3xl font-bold leading-tight tracking-tight">
            Project Management without bullshit.
          </h1>
          <p className="text-base leading-relaxed text-white/75">
            Plan sprints, track tasks, and ship work with your team — without the
            enterprise bloat.
          </p>
          <div
            className="h-1 w-16 rounded-full bg-[var(--brand-yellow)]"
            aria-hidden
          />
        </div>
      </div>
    </div>
  );
}
