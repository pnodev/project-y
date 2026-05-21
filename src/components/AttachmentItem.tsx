import { Attachment } from "~/db/schema";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { EllipsisVertical, File, FileVideo, Trash2 } from "lucide-react";
import { PdfIcon } from "./icons/PdfIcon";
import { ConfirmDialog } from "./ConfirmDialog";
import { useDeleteAttachmentMutation } from "~/db/mutations/attachments";
import { useCallback, useState } from "react";
import { EndlessLoadingSpinner } from "./EndlessLoadingSpinner";
import {
  formatAttachmentSize,
  getAttachmentPreviewMode,
} from "~/lib/attachment-preview";
import { cn } from "~/lib/utils";

function AttachmentThumbnail({ attachment }: { attachment: Attachment }) {
  const mode = getAttachmentPreviewMode(attachment.type);

  if (mode === "image" && attachment.url) {
    return (
      <img
        src={attachment.url}
        alt=""
        className="h-[130px] w-full object-cover bg-gray-200"
      />
    );
  }

  if (mode === "image") {
    return (
      <div className="flex h-[130px] w-full items-center justify-center bg-gray-200">
        <File className="size-10 text-gray-500" />
      </div>
    );
  }

  if (mode === "pdf") {
    return (
      <div className="flex h-[130px] w-full items-center justify-center bg-gray-200">
        <PdfIcon className="size-14" />
      </div>
    );
  }

  const Icon = mode === "video" ? FileVideo : File;

  return (
    <div className="flex h-[130px] w-full items-center justify-center bg-gray-200">
      <Icon className="size-10 text-gray-500" />
    </div>
  );
}

export function AttachmentItem({
  attachment,
  index,
  onOpen,
}: {
  attachment: Attachment;
  index: number;
  onOpen: (index: number) => void;
}) {
  const deleteAttachment = useDeleteAttachmentMutation();
  const [isDeleting, setIsDeleting] = useState(false);
  const previewMode = getAttachmentPreviewMode(attachment.type);

  const handlePreviewClick = useCallback(() => {
    if (previewMode === "download") {
      const link = document.createElement("a");
      link.href = attachment.url;
      link.download = attachment.name;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.click();
      return;
    }
    onOpen(index);
  }, [previewMode, attachment.url, attachment.name, index, onOpen]);

  return (
    <div className="relative flex flex-col gap-2 rounded-sm border bg-card p-2 shadow">
      <EndlessLoadingSpinner isActive={isDeleting} centered hasBackdrop />
      <div
        className="absolute right-3 top-3 z-10 flex h-7 rounded bg-white shadow"
        onClick={(e) => e.stopPropagation()}
      >
        <DropdownMenu>
          <DropdownMenuTrigger className="cursor-pointer">
            <EllipsisVertical className="size-5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <ConfirmDialog
              title="Confirm Deletion"
              description={`Are you sure you want to delete this attachment? This action cannot be undone.`}
              onConfirm={async () => {
                setIsDeleting(true);
                await deleteAttachment(attachment.id);
                setIsDeleting(false);
              }}
              confirmText="Delete"
              cancelText="Cancel"
            >
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                }}
                className="text-red-600 focus:text-red-600 focus:bg-red-50"
              >
                <Trash2 className="text-red-600" />
                Delete
              </DropdownMenuItem>
            </ConfirmDialog>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <button
        type="button"
        onClick={handlePreviewClick}
        className={cn(
          "cursor-pointer text-left transition-opacity hover:opacity-90",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
        )}
        aria-label={
          previewMode === "download"
            ? `Download ${attachment.name}`
            : `Open ${attachment.name}`
        }
      >
        <AttachmentThumbnail attachment={attachment} />
        <div className="mt-2 flex flex-col gap-1">
          <div className="truncate text-sm font-medium">{attachment.name}</div>
          <div className="text-xs text-gray-500">
            {formatAttachmentSize(attachment.size)}
          </div>
        </div>
      </button>
    </div>
  );
}
