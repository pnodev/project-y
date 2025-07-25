import { Attachment } from "~/db/schema";
import { AttachmentItem } from "./AttachmentItem";
import { UploadDropzone } from "~/utils/uploadthing";
import { useState } from "react";
import { TaskLabel } from "./ui/TaskLabel";
import { Button } from "./ui/button";
import { CloudUpload, List, UploadIcon } from "lucide-react";

export function AttachmentArea({
  attachments,
  onUpload,
}: {
  attachments: Attachment[];
  onUpload: (
    data: {
      name: string;
      ufsUrl: string;
      key: string;
      size: number;
      type: string;
      serverData: { uploadedBy: string | null };
    }[]
  ) => void;
}) {
  const [currentState, setCurrentState] = useState<"list" | "upload">(
    attachments.length === 0 ? "upload" : "list"
  );
  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between items-center">
        <TaskLabel>Attachments</TaskLabel>
        <Button
          onClick={() =>
            setCurrentState(currentState === "list" ? "upload" : "list")
          }
          variant={"outline"}
          size={"icon"}
        >
          {currentState === "list" ? <CloudUpload /> : <List />}
        </Button>
      </div>
      {currentState === "list" ? (
        <div className="grid grid-cols-4 gap-x-2 gap-y-4">
          {attachments.map((attachment) => (
            <AttachmentItem key={attachment.id} attachment={attachment} />
          ))}
        </div>
      ) : (
        <UploadDropzone
          endpoint="attachmentUploader"
          config={{ mode: "auto" }}
          onClientUploadComplete={(data) => {
            onUpload(data);
            setCurrentState("list");
          }}
        />
      )}
    </div>
  );
}
