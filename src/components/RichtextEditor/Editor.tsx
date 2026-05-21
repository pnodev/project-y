 
 
 
 

import "./styles.css";

import TextStyle from "@tiptap/extension-text-style";
import { EditorProvider, useCurrentEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import React from "react";
import {
  BoldIcon,
  CodeIcon,
  ItalicIcon,
  ListOrderedIcon,
  StrikethroughIcon,
  List,
  QuoteIcon,
  Undo,
  Redo,
} from "lucide-react";
import { cn } from "~/lib/utils";

const MenuBar = () => {
  const { editor } = useCurrentEditor();

  if (!editor) {
    return null;
  }

  return (
    <div className="flex h-12 flex-wrap gap-1 border-b border-border/60 bg-muted/40 p-1">
      <MenuBarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        disabled={!editor.can().chain().focus().toggleBold().run()}
        className={
          editor.isActive("bold")
            ? "bg-muted text-foreground hover:bg-muted/80"
            : "bg-transparent text-foreground hover:bg-muted/60"
        }
      >
        <BoldIcon />
      </MenuBarButton>
      <MenuBarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        disabled={!editor.can().chain().focus().toggleItalic().run()}
        className={
          editor.isActive("italic")
            ? "bg-muted text-foreground hover:bg-muted/80"
            : "bg-transparent text-foreground hover:bg-muted/60"
        }
      >
        <ItalicIcon />
      </MenuBarButton>
      <MenuBarButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        disabled={!editor.can().chain().focus().toggleStrike().run()}
        className={
          editor.isActive("strike")
            ? "bg-muted text-foreground hover:bg-muted/80"
            : "bg-transparent text-foreground hover:bg-muted/60"
        }
      >
        <StrikethroughIcon />
      </MenuBarButton>
      <MenuBarButton
        onClick={() => editor.chain().focus().setParagraph().run()}
        className={
          editor.isActive("paragraph")
            ? "bg-muted text-foreground hover:bg-muted/80"
            : "bg-transparent text-foreground hover:bg-muted/60"
        }
      >
        p
      </MenuBarButton>
      <MenuBarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        className={
          editor.isActive("heading", { level: 1 })
            ? "bg-muted text-foreground hover:bg-muted/80"
            : "bg-transparent text-foreground hover:bg-muted/60"
        }
      >
        H1
      </MenuBarButton>
      <MenuBarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={
          editor.isActive("heading", { level: 2 })
            ? "bg-muted text-foreground hover:bg-muted/80"
            : "bg-transparent text-foreground hover:bg-muted/60"
        }
      >
        H2
      </MenuBarButton>
      <MenuBarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        className={
          editor.isActive("heading", { level: 3 })
            ? "bg-muted text-foreground hover:bg-muted/80"
            : "bg-transparent text-foreground hover:bg-muted/60"
        }
      >
        H3
      </MenuBarButton>
      <MenuBarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()}
        className={
          editor.isActive("heading", { level: 4 })
            ? "bg-muted text-foreground hover:bg-muted/80"
            : "bg-transparent text-foreground hover:bg-muted/60"
        }
      >
        H4
      </MenuBarButton>
      <MenuBarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 5 }).run()}
        className={
          editor.isActive("heading", { level: 5 })
            ? "bg-muted text-foreground hover:bg-muted/80"
            : "bg-transparent text-foreground hover:bg-muted/60"
        }
      >
        H5
      </MenuBarButton>
      <MenuBarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 6 }).run()}
        className={
          editor.isActive("heading", { level: 6 })
            ? "bg-muted text-foreground hover:bg-muted/80"
            : "bg-transparent text-foreground hover:bg-muted/60"
        }
      >
        H6
      </MenuBarButton>
      <MenuBarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={
          editor.isActive("bulletList")
            ? "bg-muted text-foreground hover:bg-muted/80"
            : "bg-transparent text-foreground hover:bg-muted/60"
        }
      >
        <List />
      </MenuBarButton>
      <MenuBarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={
          editor.isActive("orderedList")
            ? "bg-muted text-foreground hover:bg-muted/80"
            : "bg-transparent text-foreground hover:bg-muted/60"
        }
      >
        <ListOrderedIcon />
      </MenuBarButton>
      <MenuBarButton
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        className={
          editor.isActive("codeBlock")
            ? "bg-muted text-foreground hover:bg-muted/80"
            : "bg-transparent text-foreground hover:bg-muted/60"
        }
      >
        <CodeIcon />
      </MenuBarButton>
      <MenuBarButton
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        className={
          editor.isActive("blockquote")
            ? "bg-muted text-foreground hover:bg-muted/80"
            : "bg-transparent text-foreground hover:bg-muted/60"
        }
      >
        <QuoteIcon />
      </MenuBarButton>
      <MenuBarButton
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().chain().focus().undo().run()}
        className="bg-transparent text-foreground hover:bg-muted/60"
      >
        <Undo />
      </MenuBarButton>
      <MenuBarButton
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().chain().focus().redo().run()}
        className="bg-transparent text-foreground hover:bg-muted/60"
      >
        <Redo />
      </MenuBarButton>
    </div>
  );
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}
const MenuBarButton = ({ children, className, ...props }: ButtonProps) => {
  return (
    <button
      className={cn(
        className,
        "flex h-10 w-10 cursor-pointer items-center justify-center rounded-sm px-2 py-1.5 [&_svg]:size-4"
      )}
      {...props}
    >
      {children}
    </button>
  );
};

const extensions = [
  TextStyle.configure({}),
  StarterKit.configure({
    bulletList: {
      keepMarks: true,
      keepAttributes: false, // TODO : Making this as `false` becase marks are not preserved when I try to preserve attrs, awaiting a bit of help
    },
    orderedList: {
      keepMarks: true,
      keepAttributes: false, // TODO : Making this as `false` becase marks are not preserved when I try to preserve attrs, awaiting a bit of help
    },
  }),
];

export const RichtextEditor = ({
  content,
  onUpdate,
}: {
  content: string;
  onUpdate: ({ text, plainText }: { text: string; plainText: string }) => void;
}) => {
  return (
    <div className="richtext-editor relative z-0 min-h-[220px] w-full rounded-md border border-border/60 bg-background text-base shadow-none">
      <EditorProvider
        key={content}
        slotBefore={<MenuBar />}
        extensions={extensions}
        content={content}
        immediatelyRender={false}
        onBlur={({ editor }) =>
          onUpdate({
            text: editor.getHTML(),
            plainText: editor.getText({ blockSeparator: "\n\n" }),
          })
        }
      ></EditorProvider>
    </div>
  );
};
