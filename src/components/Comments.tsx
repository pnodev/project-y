import { useEffect, useRef } from "react";
import { Comment } from "~/db/schema";
import { cn } from "~/lib/utils";
import { Card, CardContent, CardHeader } from "./ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";

interface AugmentedComment extends Comment {
  author: string;
  authorAvatar: string;
}

export function Comments({
  className,
  comments,
}: {
  className?: string;
  comments: AugmentedComment[];
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [comments]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "overflow-y-auto h-px pb-2 gap-1.5 flex flex-col -mr-6 -ml-6 pl-6 pr-6 border-b",
        className
      )}
    >
      {comments.map((comment) => {
        const initials = comment.author
          .split(" ")
          .map((name) => name.charAt(0).toUpperCase())
          .join("");
        const formattedContent = comment.content.replace(
          /(\r\n|\n|\r)/g,
          "<br />"
        );

        return (
          <Card key={comment.id}>
            <CardHeader className="flex items-center flex-row space-x-2 py-2 space-y-0">
              <Avatar className="size-6 my-0">
                <AvatarImage src={comment.authorAvatar} />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <span className="font-medium text-xs">{comment.author}</span>
              <span className="grow flex flex-col items-end text-xs text-gray-500">
                {new Intl.DateTimeFormat("de-DE", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                }).format(comment.createdAt)}
              </span>
            </CardHeader>
            <CardContent className="px-4 text-sm text-gray-800 pb-4 pt-2">
              <div dangerouslySetInnerHTML={{ __html: formattedContent }} />
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
