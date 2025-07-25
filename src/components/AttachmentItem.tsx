import { Attachment } from "~/db/schema";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { EllipsisVertical, Trash2 } from "lucide-react";
import { ConfirmDialog } from "./ConfirmDialog";
import { useDeleteAttachmentMutation } from "~/db/mutations/attachments";
import { useState } from "react";
import { EndlessLoadingSpinner } from "./EndlessLoadingSpinner";

export function AttachmentItem({ attachment }: { attachment: Attachment }) {
  const deleteAttachment = useDeleteAttachmentMutation();
  const [isDeleting, setIsDeleting] = useState(false);
  return (
    <div className="flex flex-col gap-2 shadow relative rounded-sm border bg-card p-2">
      <EndlessLoadingSpinner isActive={isDeleting} centered hasBackdrop />
      <div className="absolute right-3 top-3 flex h-7 rounded shadow bg-white">
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
                  e.preventDefault(); // Prevent the dropdown from closing immediately
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
      {attachment.type.includes("image") ? (
        <img
          src={attachment.url}
          className="w-full h-[130px] object-cover bg-gray-200"
        />
      ) : (
        <div className="w-10 h-10 rounded-full bg-gray-200"></div>
      )}
      <div className="flex flex-col gap-1">
        <div className="text-sm font-medium">{attachment.name}</div>
        <div className="text-xs text-gray-500">{attachment.size} bytes</div>
      </div>
    </div>
  );
}
