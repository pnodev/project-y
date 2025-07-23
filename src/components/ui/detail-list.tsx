import { LucideIcon } from "lucide-react";
import { TaskLabel } from "./TaskLabel";
import { cn } from "~/lib/utils";
import { createContext, useContext } from "react";

const SizeContext = createContext("large");

export const DetailList = ({
  children,
  size = "large",
}: {
  children: React.ReactNode;
  size?: "small" | "large";
}) => {
  return (
    <SizeContext.Provider value={size}>
      <dl
        className={cn(
          "grid",
          size === "large"
            ? "grid-cols-2 gap-x-2 gap-y-3"
            : "grid-cols-1 gap-x-1 gap-y-1.5"
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
  statusColor = "text-gray-400",
  className,
}: {
  children?: React.ReactNode;
  label: string;
  icon?: LucideIcon;
  statusColor?: string;
  className?: string;
}) => {
  const size = useContext(SizeContext);
  return (
    <div className={cn("grid grid-cols-12 gap-1 items-center", className)}>
      <dt className={cn(size === "large" ? "col-span-4" : "col-span-4")}>
        {Icon ? (
          <Icon className={cn("inline mr-2 size-3.5", statusColor)} />
        ) : null}
        <TaskLabel
          className={cn(
            statusColor !== "text-gray-400" ? statusColor : "",
            size === "large" ? "text-sm" : "text-xs"
          )}
        >
          {label}
        </TaskLabel>
      </dt>
      <dd
        className={cn(
          "text-gray-700",
          size === "large" ? "text-sm col-span-8" : "text-xs col-span-8",
          statusColor !== "text-gray-400" ? statusColor : ""
        )}
      >
        {children ? children : <span className="text-gray-500">Empty</span>}
      </dd>
    </div>
  );
};
