import { Attachment } from "~/db/schema";
import { AttachmentItem } from "./AttachmentItem";
import { AttachmentLightbox } from "./AttachmentLightbox";
import { UploadDropzone } from "~/utils/uploadthing";
import { useCallback, useEffect, useState } from "react";
import { TaskLabel } from "./ui/TaskLabel";
import { Button } from "./ui/button";
import { CloudUpload, List } from "lucide-react";
import { cn } from "~/lib/utils";

export function AttachmentArea({
  attachments,
  onUpload,
  fileDragOver = false,
  onDismissFileDrag,
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
  fileDragOver?: boolean;
  onDismissFileDrag?: () => void;
}) {
  const [view, setView] = useState<"list" | "upload">(
    attachments.length === 0 ? "upload" : "list"
  );
  const [isUploading, setIsUploading] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    if (fileDragOver || isUploading) return;
    setView(attachments.length === 0 ? "upload" : "list");
  }, [fileDragOver, isUploading, attachments.length]);

  useEffect(() => {
    if (fileDragOver) setView("upload");
  }, [fileDragOver]);

  const handleUploadComplete = useCallback(
    (
      data: {
        name: string;
        ufsUrl: string;
        key: string;
        size: number;
        type: string;
        serverData: { uploadedBy: string | null };
      }[]
    ) => {
      setIsUploading(false);
      onDismissFileDrag?.();
      onUpload(data);
      setView("list");
    },
    [onUpload, onDismissFileDrag]
  );

  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between items-center">
        <TaskLabel>Attachments</TaskLabel>
        <Button
          onClick={() => setView(view === "list" ? "upload" : "list")}
          variant={"outline"}
          size={"icon"}
          aria-label={view === "list" ? "Upload attachments" : "Show attachments"}
        >
          {view === "list" ? <CloudUpload /> : <List />}
        </Button>
      </div>
      <div
        className={cn(
          "min-h-[120px] rounded-lg transition-colors",
          fileDragOver && view === "upload" && "bg-muted/40"
        )}
      >
        {view === "list" && !isUploading ? (
          <div className="grid grid-cols-4 gap-x-2 gap-y-4">
            {attachments.map((attachment, index) => (
              <AttachmentItem
                key={attachment.id}
                attachment={attachment}
                index={index}
                onOpen={setLightboxIndex}
              />
            ))}
          </div>
        ) : (
          <UploadDropzone
            endpoint="attachmentUploader"
            config={{ mode: "auto" }}
            onDrop={() => setIsUploading(true)}
            onUploadBegin={() => setIsUploading(true)}
            onClientUploadComplete={handleUploadComplete}
            onUploadError={() => {
              setIsUploading(false);
              onDismissFileDrag?.();
              setView("upload");
            }}
          />
        )}
      </div>
      <AttachmentLightbox
        attachments={attachments}
        initialIndex={lightboxIndex ?? 0}
        open={lightboxIndex !== null}
        onOpenChange={(open) => {
          if (!open) setLightboxIndex(null);
        }}
      />
    </div>
  );
}
