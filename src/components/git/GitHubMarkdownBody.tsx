import { useMemo, useState, type ReactNode } from "react";
import { Copy } from "lucide-react";
import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import { githubMarkdownSanitizeSchema } from "~/components/git/github-markdown-sanitize";
import {
  hasGitHubCollapsibleSections,
  preprocessGitHubMarkdown,
} from "~/lib/git/preprocess-github-markdown";
import { cn } from "~/lib/utils";

const COLLAPSE_CHAR_THRESHOLD = 1_400;

/** Paragraph spacing without <p> — GitHub HTML often nests blocks inside loose paragraphs. */
const markdownParagraphClass = "gh-markdown-p my-1.5 leading-relaxed";

function markdownNodeText(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(markdownNodeText).join("");
  if (typeof node === "object" && "props" in node) {
    const el = node as { props: { children?: ReactNode } };
    return markdownNodeText(el.props.children);
  }
  return "";
}

function MarkdownPreWithCopy({ children }: { children?: ReactNode }) {
  const text = useMemo(() => markdownNodeText(children).trimEnd(), [children]);

  const copy = () => {
    if (!text) return;
    void navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  return (
    <div className="group/gh-pre relative my-2">
      {text ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="text-muted-foreground absolute top-1 right-1 z-10 size-7 bg-background/80 opacity-100 shadow-sm backdrop-blur-sm sm:opacity-0 sm:group-hover/gh-pre:opacity-100 sm:focus-visible:opacity-100"
          aria-label="Copy code"
          onClick={copy}
        >
          <Copy className="size-3.5" />
        </Button>
      ) : null}
      <pre className="bg-muted/80 overflow-x-auto rounded-md border border-border/60 p-2.5 pr-10 text-[11px] leading-relaxed">
        {children}
      </pre>
    </div>
  );
}

const markdownComponents: Components = {
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary font-medium underline-offset-2 hover:underline"
    >
      {children}
    </a>
  ),
  pre: ({ children }) => <MarkdownPreWithCopy>{children}</MarkdownPreWithCopy>,
  code: ({ className, children, ...props }) => {
    const isBlock = Boolean(className);
    if (isBlock) {
      return (
        <code className={cn("font-mono", className)} {...props}>
          {children}
        </code>
      );
    }
    return (
      <code
        className="bg-muted rounded px-1 py-0.5 font-mono text-[11px]"
        {...props}
      >
        {children}
      </code>
    );
  },
  blockquote: ({ children }) => (
    <blockquote className="border-primary/30 text-muted-foreground my-2 border-l-2 pl-3 italic">
      {children}
    </blockquote>
  ),
  table: ({ children }) => (
    <div className="my-2 overflow-x-auto">
      <table className="w-full border-collapse text-[11px]">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border-border/60 bg-muted/50 border px-2 py-1 text-left font-medium">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border-border/60 border px-2 py-1">{children}</td>
  ),
  details: ({ children }) => (
    <details className="bg-muted/30 my-2 rounded-md border border-border/60">
      {children}
    </details>
  ),
  summary: ({ children }) => (
    <summary className="cursor-pointer px-2.5 py-2 text-xs font-medium select-none">
      {children}
    </summary>
  ),
  hr: () => <hr className="border-border/60 my-3" />,
  ul: ({ children }) => (
    <ul className="my-1.5 list-disc space-y-0.5 pl-5">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="my-1.5 list-decimal space-y-0.5 pl-5">{children}</ol>
  ),
  p: ({ children }) => (
    <div className={markdownParagraphClass}>{children}</div>
  ),
  h1: ({ children }) => (
    <h1 className="mt-2 mb-1 text-sm font-semibold">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="mt-2 mb-1 text-sm font-semibold">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="mt-2 mb-1 text-xs font-semibold">{children}</h3>
  ),
  h4: ({ children }) => (
    <h4 className="mt-1.5 mb-0.5 text-xs font-medium">{children}</h4>
  ),
};

export function GitHubMarkdownBody({
  body,
  className,
  collapsible = true,
}: {
  body: string;
  className?: string;
  collapsible?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const processed = useMemo(() => preprocessGitHubMarkdown(body), [body]);
  const hasNestedCollapsibles = useMemo(
    () => hasGitHubCollapsibleSections(processed),
    [processed]
  );
  const isLong =
    collapsible &&
    !hasNestedCollapsibles &&
    processed.length > COLLAPSE_CHAR_THRESHOLD;

  if (!processed) return null;

  const markdown = (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[
        rehypeRaw,
        [rehypeSanitize, githubMarkdownSanitizeSchema],
      ]}
      components={markdownComponents}
    >
      {processed}
    </ReactMarkdown>
  );

  return (
    <div className={cn("gh-markdown text-xs text-inherit", className)}>
      <div
        className={cn(
          "relative",
          isLong && !expanded && "max-h-56 overflow-hidden"
        )}
      >
        {markdown}
        {isLong && !expanded ? (
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-linear-to-t from-muted/30 to-transparent"
            aria-hidden
          />
        ) : null}
      </div>
      {isLong ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-muted-foreground mt-1 h-7 px-0 text-xs"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? "Show less" : "Show more"}
        </Button>
      ) : null}
    </div>
  );
}
