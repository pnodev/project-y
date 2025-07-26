import {
  useOrganization,
  useOrganizationList,
} from "@clerk/tanstack-react-start";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

type User = {
  id: string;
  name: string;
  avatar: string;
};

export function UserSelect({
  user,
  onValueChange,
}: {
  user: string;
  onValueChange: (userId: string) => void;
}) {
  const { organization } = useOrganization();
  console.log(organization?.getMemberships());
  return (
    <Select name="priority" defaultValue={user} onValueChange={onValueChange}>
      <SelectTrigger size="sm">
        <SelectValue placeholder="Select a user" />
      </SelectTrigger>
      <SelectContent>
        {/* {PRIORITY_VALUES.map((priority) => {
          const color = priorityColorMap[priority] || "text-gray-500";
          return (
            <SelectItem
              key={priority}
              value={priority}
              className={`${color} font-semibold capitalize`}
            >
              {priority}
            </SelectItem>
          );
        })} */}
      </SelectContent>
    </Select>
  );
}
