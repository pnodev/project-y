import { useState, useRef } from "react";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";

export function CommentInput({
  onSubmit,
}: {
  onSubmit: (comment: string) => Promise<void>;
}) {
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const handleSubmit = async (form: HTMLFormElement) => {
    setIsSending(true);
    const formData = new FormData(form);
    const content = formData.get("content");
    if (typeof content === "string" && content.trim()) {
      await onSubmit(content.trim());
    }
    setIsSending(false);
    form.reset();
    textareaRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.ctrlKey && e.key === "Enter") {
      e.preventDefault();
      const form = e.currentTarget.closest("form") as HTMLFormElement;
      if (form) {
        handleSubmit(form);
      }
    }
  };

  return (
    <form
      onSubmit={async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const form = e.currentTarget;
        await handleSubmit(form);
      }}
      className="flex items-end gap-1.5"
    >
      <Textarea
        ref={textareaRef}
        name="content"
        className="h-[40px] min-h-[40px] focus:min-h-[180px] transition-all duration-200 ease-in-out"
        placeholder="Add a comment..."
        onKeyDown={handleKeyDown}
      />
      <Button loading={isSending} type="submit">
        Send
      </Button>
    </form>
  );
}
