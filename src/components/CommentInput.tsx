import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";

export function CommentInput() {
  return (
    <div className="flex items-center gap-1.5">
      <Textarea
        className="h-[40px] min-h-[40px]"
        placeholder="Add a comment..."
      />
      <Button>Send</Button>
    </div>
  );
}
