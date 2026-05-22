import { useCallback, useId, useRef, useState } from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import { LoadingSpinner } from "~/components/ui/loading-spinner";
import {
  formHintClass,
  formLabelClass,
  imageUploadRowClass,
} from "~/components/ui/surface-styles";
import type { UploadRouter } from "~/server/uploadthing";
import { useUploadThing } from "~/utils/uploadthing";
import { cn } from "~/lib/utils";

type ImageUploadEndpoint = keyof Pick<
  UploadRouter,
  "avatarUploader" | "projectLogoUploader"
>;

type ImageUploadFieldProps = {
  endpoint: ImageUploadEndpoint;
  imageUrl?: string | null;
  fallback: string;
  label: string;
  hint?: string;
  onUploaded: (url: string) => void | Promise<void>;
  previewShape?: "circle" | "rounded";
  className?: string;
};

export function ImageUploadField({
  endpoint,
  imageUrl,
  fallback,
  label,
  hint = "PNG or JPG · max 4MB",
  onUploaded,
  previewShape = "circle",
  className,
}: ImageUploadFieldProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragActive, setIsDragActive] = useState(false);

  const { startUpload, isUploading } = useUploadThing(endpoint, {
    onClientUploadComplete: (files) => {
      const file = files[0];
      if (file?.ufsUrl) {
        void onUploaded(file.ufsUrl);
      }
    },
    onUploadError: (error) => {
      toast.error(error.message ?? "Upload failed");
    },
  });

  const uploadFiles = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files).filter((file) =>
        file.type.startsWith("image/")
      );
      if (list.length === 0) {
        toast.error("Please choose an image file");
        return;
      }
      await startUpload([list[0]!]);
    },
    [startUpload]
  );

  const openFilePicker = () => {
    if (!isUploading) {
      inputRef.current?.click();
    }
  };

  const statusText = isUploading
    ? "Uploading…"
    : isDragActive
      ? "Drop image to upload"
      : imageUrl
        ? "Replace the current image"
        : "Upload an image";

  const actionLabel = isUploading
    ? "Uploading…"
    : imageUrl
      ? "Replace image"
      : "Choose image";

  return (
    <div className={cn("space-y-2", className)}>
      <span className={formLabelClass}>{label}</span>
      <div
        data-drag-active={isDragActive}
        className={imageUploadRowClass}
        onDragEnter={(event) => {
          event.preventDefault();
          setIsDragActive(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          if (!event.currentTarget.contains(event.relatedTarget as Node)) {
            setIsDragActive(false);
          }
        }}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragActive(false);
          if (event.dataTransfer.files.length > 0) {
            void uploadFiles(event.dataTransfer.files);
          }
        }}
      >
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept="image/*"
          className="sr-only"
          disabled={isUploading}
          onChange={(event) => {
            if (event.target.files?.length) {
              void uploadFiles(event.target.files);
              event.target.value = "";
            }
          }}
        />

        <button
          type="button"
          disabled={isUploading}
          aria-label={imageUrl ? `Replace ${label}` : `Upload ${label}`}
          className={cn(
            "relative shrink-0 rounded-[inherit] outline-none transition-shadow",
            "focus-visible:ring-[3px] focus-visible:ring-ring/50",
            previewShape === "circle" ? "rounded-full" : "rounded-md"
          )}
          onClick={openFilePicker}
        >
          {previewShape === "circle" ? (
            <Avatar className="size-16 ring-1 ring-border/60">
              <AvatarImage src={imageUrl ?? undefined} alt="" />
              <AvatarFallback className="bg-muted text-lg font-medium text-muted-foreground">
                {fallback}
              </AvatarFallback>
            </Avatar>
          ) : (
            <div className="flex size-16 items-center justify-center overflow-hidden rounded-md bg-muted ring-1 ring-border/60">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt=""
                  className="size-full object-cover"
                />
              ) : (
                <span className="text-lg font-medium text-muted-foreground">
                  {fallback}
                </span>
              )}
            </div>
          )}
          {isUploading ? (
            <div className="absolute inset-0 flex items-center justify-center rounded-[inherit] bg-background/70">
              <LoadingSpinner isActive className="size-5 text-primary" />
            </div>
          ) : null}
        </button>

        <div className="flex min-w-0 flex-col items-start gap-2">
          <div className="space-y-0.5">
            <p className="text-sm font-medium text-foreground">{statusText}</p>
            <p className={formHintClass}>{hint}</p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isUploading}
            onClick={openFilePicker}
          >
            {actionLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
