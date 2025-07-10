export const DetailList = ({ children }: { children: React.ReactNode }) => {
  return <dl className="grid grid-cols-2 gap-2">{children}</dl>;
};

export const DetailListItem = ({
  children,
  label,
}: {
  children?: React.ReactNode;
  label: string;
}) => {
  return (
    <div className="flex gap-1">
      <dt className="text-sm font-medium text-gray-800">{label}</dt>
      <dd className="text-sm text-gray-800">
        {children ? children : <span className="text-gray-500">Empty</span>}
      </dd>
    </div>
  );
};
