import { Attachment } from "~/db/schema";

export function AttachmentItem({ attachment }: { attachment: Attachment }) {
  return (
    <div className="flex flex-col gap-2">
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
