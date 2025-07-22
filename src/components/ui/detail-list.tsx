import { LucideIcon } from "lucide-react";
import { TaskLabel } from "./TaskLabel";

export const DetailList = ({ children }: { children: React.ReactNode }) => {
  return <dl className="grid grid-cols-2 gap-x-2 gap-y-3">{children}</dl>;
};

export const DetailListItem = ({
  children,
  label,
  icon: Icon,
}: {
  children?: React.ReactNode;
  label: string;
  icon?: LucideIcon;
}) => {
  return (
    <div className="grid grid-cols-12 gap-1 items-center">
      <dt className="col-span-4">
        {Icon ? <Icon className="inline mr-2 size-3.5 text-gray-400" /> : null}
        <TaskLabel>{label}</TaskLabel>
      </dt>
      <dd className="text-sm text-gray-700 col-span-8">
        {children ? children : <span className="text-gray-500">Empty</span>}
      </dd>
    </div>
  );
};
