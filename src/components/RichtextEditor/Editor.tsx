/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

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
    <div className="h-12 flex flex-wrap gap-1 bg-gray-100 p-1">
      <MenuBarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        disabled={!editor.can().chain().focus().toggleBold().run()}
        className={
          editor.isActive("bold")
            ? "bg-gray-200 text-black hover:bg-gray-300"
            : "bg-transparent text-gray-900 hover:bg-gray-300"
        }
      >
        <BoldIcon />
      </MenuBarButton>
      <MenuBarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        disabled={!editor.can().chain().focus().toggleItalic().run()}
        className={
          editor.isActive("italic")
            ? "bg-gray-200 text-black hover:bg-gray-300"
            : "bg-transparent text-gray-900 hover:bg-gray-300"
        }
      >
        <ItalicIcon />
      </MenuBarButton>
      <MenuBarButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        disabled={!editor.can().chain().focus().toggleStrike().run()}
        className={
          editor.isActive("strike")
            ? "bg-gray-200 text-black hover:bg-gray-300"
            : "bg-transparent text-gray-900 hover:bg-gray-300"
        }
      >
        <StrikethroughIcon />
      </MenuBarButton>
      <MenuBarButton
        onClick={() => editor.chain().focus().setParagraph().run()}
        className={
          editor.isActive("paragraph")
            ? "bg-gray-200 text-black hover:bg-gray-300"
            : "bg-transparent text-gray-900 hover:bg-gray-300"
        }
      >
        p
      </MenuBarButton>
      <MenuBarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        className={
          editor.isActive("heading", { level: 1 })
            ? "bg-gray-200 text-black hover:bg-gray-300"
            : "bg-transparent text-gray-900 hover:bg-gray-300"
        }
      >
        H1
      </MenuBarButton>
      <MenuBarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={
          editor.isActive("heading", { level: 2 })
            ? "bg-gray-200 text-black hover:bg-gray-300"
            : "bg-transparent text-gray-900 hover:bg-gray-300"
        }
      >
        H2
      </MenuBarButton>
      <MenuBarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        className={
          editor.isActive("heading", { level: 3 })
            ? "bg-gray-200 text-black hover:bg-gray-300"
            : "bg-transparent text-gray-900 hover:bg-gray-300"
        }
      >
        H3
      </MenuBarButton>
      <MenuBarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()}
        className={
          editor.isActive("heading", { level: 4 })
            ? "bg-gray-200 text-black hover:bg-gray-300"
            : "bg-transparent text-gray-900 hover:bg-gray-300"
        }
      >
        H4
      </MenuBarButton>
      <MenuBarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 5 }).run()}
        className={
          editor.isActive("heading", { level: 5 })
            ? "bg-gray-200 text-black hover:bg-gray-300"
            : "bg-transparent text-gray-900 hover:bg-gray-300"
        }
      >
        H5
      </MenuBarButton>
      <MenuBarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 6 }).run()}
        className={
          editor.isActive("heading", { level: 6 })
            ? "bg-gray-200 text-black hover:bg-gray-300"
            : "bg-transparent text-gray-900 hover:bg-gray-300"
        }
      >
        H6
      </MenuBarButton>
      <MenuBarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={
          editor.isActive("bulletList")
            ? "bg-gray-200 text-black hover:bg-gray-300"
            : "bg-transparent text-gray-900 hover:bg-gray-300"
        }
      >
        <List />
      </MenuBarButton>
      <MenuBarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={
          editor.isActive("orderedList")
            ? "bg-gray-200 text-black hover:bg-gray-300"
            : "bg-transparent text-gray-900 hover:bg-gray-300"
        }
      >
        <ListOrderedIcon />
      </MenuBarButton>
      <MenuBarButton
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        className={
          editor.isActive("codeBlock")
            ? "bg-gray-200 text-black hover:bg-gray-300"
            : "bg-transparent text-gray-900 hover:bg-gray-300"
        }
      >
        <CodeIcon />
      </MenuBarButton>
      <MenuBarButton
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        className={
          editor.isActive("blockquote")
            ? "bg-gray-200 text-black hover:bg-gray-300"
            : "bg-transparent text-gray-900 hover:bg-gray-300"
        }
      >
        <QuoteIcon />
      </MenuBarButton>
      <MenuBarButton
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().chain().focus().undo().run()}
        className="bg-transparent text-gray-900 hover:bg-gray-300"
      >
        <Undo />
      </MenuBarButton>
      <MenuBarButton
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().chain().focus().redo().run()}
        className="bg-transparent text-gray-900 hover:bg-gray-300"
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
        "h-10 w-10 rounded px-2 py-1.5 [&_svg]:size-4 flex justify-center items-center cursor-pointer"
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
    <div className="richtext-editor min-h-[220px] w-full rounded-md border border-input bg-transparent text-base">
      <EditorProvider
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
