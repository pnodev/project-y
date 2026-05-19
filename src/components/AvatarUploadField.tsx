import { UploadButton } from "~/utils/uploadthing";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";

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
    <div className="flex items-center gap-4">
      <Avatar className="size-14 shrink-0">
        <AvatarImage src={imageUrl ?? undefined} alt="" />
        <AvatarFallback className="text-lg">{fallback}</AvatarFallback>
      </Avatar>
      <div className="flex min-w-0 flex-col gap-1">
        <p className="text-sm font-medium">{label}</p>
        <UploadButton
          endpoint="avatarUploader"
          config={{ mode: "auto" }}
          onClientUploadComplete={(files) => {
            const file = files[0];
            if (file?.ufsUrl) {
              void onUploaded(file.ufsUrl);
            }
          }}
        />
      </div>
    </div>
  );
}
