import { cn } from "~/lib/utils";

export function PdfIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 56"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("size-12", className)}
      aria-hidden
    >
      <path
        d="M10 2h22l14 14v38H10V2z"
        className="fill-white stroke-gray-300"
        strokeWidth="1.5"
      />
      <path
        d="M32 2v14h14"
        className="fill-gray-100 stroke-gray-300"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M10 40h34v14H10V40z" className="fill-red-600" />
      <text
        x="27"
        y="51"
        textAnchor="middle"
        fill="white"
        fontSize="9"
        fontWeight="700"
        fontFamily="system-ui, sans-serif"
      >
        PDF
      </text>
    </svg>
  );
}
