export const DetailList = ({ children }: { children: React.ReactNode }) => {
  return <dl className="grid grid-cols-2 gap-x-2 gap-y-3">{children}</dl>;
};

export const DetailListItem = ({
  children,
  label,
}: {
  children?: React.ReactNode;
  label: string;
}) => {
  return (
    <div className="grid grid-cols-12 gap-2 items-center">
      <dt className="text-sm font-medium text-gray-800 col-span-3">{label}</dt>
      <dd className="text-sm text-gray-800 col-span-9">
        {children ? children : <span className="text-gray-500">Empty</span>}
      </dd>
    </div>
  );
};
