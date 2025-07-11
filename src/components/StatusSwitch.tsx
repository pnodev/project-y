import { Status } from "~/db/schema";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

export function StatusSwitch({
  status,
  statuses,
  onValueChange,
}: {
  status: Status;
  statuses: Status[];
  onValueChange: (statusId: string) => void;
}) {
  return (
    <Select value={status.id} onValueChange={onValueChange}>
      <SelectTrigger size="sm" color={status.color}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {statuses.map((status) => {
          return (
            <SelectItem key={status.id} value={status.id}>
              {status.name}
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
