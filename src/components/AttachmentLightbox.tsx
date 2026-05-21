import { useCallback, useEffect, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  XIcon,
} from "lucide-react";
import { Attachment } from "~/db/schema";
import {
  formatAttachmentSize,
  getAttachmentPreviewMode,
} from "~/lib/attachment-preview";
import { cn } from "~/lib/utils";
import {
  Dialog,
  DialogClose,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";

const navButtonClass =
  "absolute top-1/2 z-10 -translate-y-1/2 border-white/30 bg-black/40 text-white hover:bg-white/10 hover:text-white disabled:opacity-30";

export function AttachmentLightbox({
  attachments,
  initialIndex,
  open,
  onOpenChange,
}: {
  attachments: Attachment[];
  initialIndex: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [index, setIndex] = useState(initialIndex);

  useEffect(() => {
    if (open) {
      setIndex(initialIndex);
    }
  }, [open, initialIndex]);

  const attachment = attachments[index];
  const mode = attachment
    ? getAttachmentPreviewMode(attachment.type)
    : null;

  const goPrev = useCallback(() => {
    setIndex((i) => Math.max(0, i - 1));
  }, []);

  const goNext = useCallback(() => {
    setIndex((i) => Math.min(attachments.length - 1, i + 1));
  }, [attachments.length]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, goPrev, goNext]);

  if (!attachment || !mode) {
    return null;
  }

  const canGoPrev = index > 0;
  const canGoNext = index < attachments.length - 1;
  const showNav = attachments.length > 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay className="z-60 bg-black/80" />
        <DialogPrimitive.Content
          className={cn(
            "fixed inset-0 z-60 flex flex-col outline-none",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 duration-200"
          )}
        >
          <header className="flex shrink-0 items-center justify-between gap-4 px-4 py-3 text-white sm:px-6">
            <div className="min-w-0 flex-1">
              <DialogTitle className="truncate text-base font-medium text-white">
                {attachment.name}
              </DialogTitle>
              <p className="text-sm text-white/70">
                {formatAttachmentSize(attachment.size)}
                {attachments.length > 1 && (
                  <span className="ml-2">
                    {index + 1} / {attachments.length}
                  </span>
                )}
              </p>
            </div>
            <DialogClose className="shrink-0 cursor-pointer rounded-sm p-1 text-white/80 transition-opacity hover:text-white focus:outline-none focus:ring-2 focus:ring-white/50">
              <XIcon className="size-6" />
              <span className="sr-only">Close</span>
            </DialogClose>
          </header>

          <div className="relative min-h-0 flex-1 px-14 pb-6 sm:px-16 sm:pb-8">
            {showNav && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  disabled={!canGoPrev}
                  onClick={goPrev}
                  className={cn(navButtonClass, "left-2 sm:left-4")}
                  aria-label="Previous attachment"
                >
                  <ChevronLeft className="size-5" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  disabled={!canGoNext}
                  onClick={goNext}
                  className={cn(navButtonClass, "right-2 sm:right-4")}
                  aria-label="Next attachment"
                >
                  <ChevronRight className="size-5" />
                </Button>
              </>
            )}

            <div className="flex h-full items-center justify-center overflow-hidden">
              {mode === "image" && attachment.url && (
                <img
                  src={attachment.url}
                  alt={attachment.name}
                  className="max-h-full max-w-full object-contain"
                />
              )}
              {mode === "video" && attachment.url && (
                <video
                  key={attachment.id}
                  src={attachment.url}
                  controls
                  className="max-h-full max-w-full"
                />
              )}
              {mode === "pdf" && attachment.url && (
                <div className="flex h-full w-full max-w-[min(96vw,1400px)] flex-col gap-3 pb-1">
                  <iframe
                    src={attachment.url}
                    title={attachment.name}
                    className="min-h-0 flex-1 rounded border-0 bg-white"
                  />
                  <a
                    href={attachment.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex shrink-0 items-center gap-1 text-sm text-white/80 hover:text-white"
                  >
                    <ExternalLink className="size-4" />
                    Open in new tab
                  </a>
                </div>
              )}
              {mode === "download" && (
                <div className="flex flex-col items-center gap-4 text-white">
                  <p className="text-sm text-white/70">
                    This file type cannot be previewed.
                  </p>
                  <a
                    href={attachment.url}
                    download={attachment.name}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-md border border-white/30 px-4 py-2 text-sm hover:bg-white/10"
                  >
                    <Download className="size-4" />
                    Download file
                  </a>
                </div>
              )}
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}
