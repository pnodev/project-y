import { LucideIcon } from "lucide-react";
import { cn } from "~/lib/utils";
import { createContext, useContext } from "react";

const SizeContext = createContext<"small" | "large">("large");

export const DetailList = ({
  children,
  size = "large",
  className,
}: {
  children: React.ReactNode;
  size?: "small" | "large";
  className?: string;
}) => {
  return (
    <SizeContext.Provider value={size}>
      <dl
        className={cn(
          "grid",
          size === "large"
            ? "grid-cols-2 gap-x-3 gap-y-1.5"
            : "grid-cols-1 gap-x-1 gap-y-1",
          className
        )}
      >
        {children}
      </dl>
    </SizeContext.Provider>
  );
};

export const DetailListItem = ({
  children,
  label,
  icon: Icon,
  statusColor = "text-muted-foreground",
  className,
  align = "center",
}: {
  children?: React.ReactNode;
  label: string;
  icon?: LucideIcon | string;
  statusColor?: string;
  className?: string;
  /** Align icon/label to top when value wraps (e.g. label chips). */
  align?: "center" | "start";
}) => {
  const size = useContext(SizeContext);
  const labelWidth = size === "large" ? "w-[5.25rem]" : "w-[4rem]";

  return (
    <div
      className={cn(
        "flex min-w-0 gap-2",
        align === "start" ? "items-start" : "items-center",
        className
      )}
    >
      <dt
        className={cn(
          "flex shrink-0 gap-1",
          align === "start" ? "items-start pt-2" : "items-center",
          labelWidth,
          statusColor
        )}
      >
        {Icon && typeof Icon !== "string" ? (
          <Icon className="size-3.5 shrink-0 opacity-70" />
        ) : null}
        {typeof Icon === "string" && Icon ? (
          <img src={Icon} className="size-3.5 shrink-0 opacity-70" alt="" />
        ) : null}
        <span
          className={cn(
            "text-muted-foreground truncate",
            size === "large" ? "text-xs" : "text-[11px]"
          )}
        >
          {label}
        </span>
      </dt>
      <dd
        className={cn(
          "min-w-0 flex-1 text-sm text-foreground",
          statusColor !== "text-muted-foreground" && statusColor
        )}
      >
        {children ?? (
          <span className="text-muted-foreground text-xs">Empty</span>
        )}
      </dd>
    </div>
  );
};
