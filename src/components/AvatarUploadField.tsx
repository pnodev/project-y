import { ImageUploadField } from "~/components/ImageUploadField";

type AvatarUploadFieldProps = {
  imageUrl?: string | null;
  fallback: string;
  label: string;
  onUploaded: (url: string) => void | Promise<void>;
};

export function AvatarUploadField({
  imageUrl,
  fallback,
  label,
  onUploaded,
}: AvatarUploadFieldProps) {
  return (
    <ImageUploadField
      endpoint="avatarUploader"
      imageUrl={imageUrl}
      fallback={fallback}
      label={label}
      onUploaded={onUploaded}
      previewShape="circle"
    />
  );
}
