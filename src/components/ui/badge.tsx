import { cn } from "~/lib/utils";

export function Badge({
  color,
  children,
  size = "small",
}: {
  color:
    | "red"
    | "orange"
    | "yellow"
    | "green"
    | "emerald"
    | "teal"
    | "cyan"
    | "blue"
    | "indigo"
    | "violet"
    | "purple"
    | "fuchsia"
    | "pink"
    | "rose"
    | "neutral";
  children: React.ReactNode;
  size?: "small" | "large";
}) {
  const colorClasses = {
    red: "bg-red-100 text-red-700 [&_svg]:fill-red-500",
    orange: "bg-orange-100 text-orange-700 [&_svg]:fill-orange-500",
    yellow: "bg-yellow-100 text-yellow-800 [&_svg]:fill-yellow-500",
    green: "bg-green-100 text-green-700 [&_svg]:fill-green-500",
    emerald: "bg-emerald-100 text-emerald-700 [&_svg]:fill-emerald-500",
    teal: "bg-teal-100 text-teal-700 [&_svg]:fill-teal-500",
    cyan: "bg-cyan-100 text-cyan-700 [&_svg]:fill-cyan-500",
    blue: "bg-blue-100 text-blue-700 [&_svg]:fill-blue-500",
    indigo: "bg-indigo-100 text-indigo-700 [&_svg]:fill-indigo-500",
    violet: "bg-violet-100 text-violet-700 [&_svg]:fill-violet-500",
    purple: "bg-purple-100 text-purple-700 [&_svg]:fill-purple-500",
    fuchsia: "bg-fuchsia-100 text-fuchsia-700 [&_svg]:fill-fuchsia-500",
    pink: "bg-pink-100 text-pink-700 [&_svg]:fill-pink-500",
    rose: "bg-rose-100 text-rose-700 [&_svg]:fill-rose-500",
    neutral: "bg-neutral-100 text-neutral-700 [&_svg]:fill-neutral-500",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded font-medium",
        size === "small"
          ? "gap-x-1.5 px-1.5 py-0.5 text-xs [&_svg]:size-1.5"
          : "",
        size === "large"
          ? "gap-x-2.5 px-2.5 py-1.5 text-sm [&_svg]:size-2"
          : "",
        colorClasses[color]
      )}
    >
      <svg viewBox="0 0 6 6" aria-hidden="true">
        <circle r={3} cx={3} cy={3} />
      </svg>
      {children}
    </span>
  );
}
