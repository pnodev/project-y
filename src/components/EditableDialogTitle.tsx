import { useEditor, EditorContent } from "@tiptap/react";
import { Document } from "@tiptap/extension-document";
import { Text } from "@tiptap/extension-text";
import { Heading } from "@tiptap/extension-heading";
import { useCallback, useRef } from "react";
import { DialogTitle } from "./ui/dialog";

interface EditableDialogTitleProps {
  initialContent?: string;
  onUpdate?: (content: string) => void;
  onDebouncedUpdate?: (content: string) => void;
  onFocus?: (content: string) => void;
  onBlur?: (content: string) => void;
  className?: string;
  placeholder?: string;
  debounceMs?: number;
  id?: string;
}

export function EditableDialogTitle({
  initialContent = "Untitled",
  onUpdate,
  onDebouncedUpdate,
  onFocus,
  onBlur,
  className = "",
  id = "",
  placeholder = "Click to edit title...",
  debounceMs = 500,
}: EditableDialogTitleProps) {
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const debouncedUpdate = useCallback(
    (content: string) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      debounceRef.current = setTimeout(() => {
        onDebouncedUpdate?.(content);
      }, debounceMs);
    },
    [onDebouncedUpdate, debounceMs]
  );

  const editor = useEditor(
    {
      extensions: [
        Document,
        Text,
        Heading.configure({
          levels: [2],
        }),
      ],
      content: `<h2>${initialContent}</h2>`,
      autofocus: false,
      immediatelyRender: false, // Prevent immediate rendering
      shouldRerenderOnTransaction: false, // Reduce re-renders
      onUpdate: ({ editor }) => {
        const textContent = editor.getText();
        onUpdate?.(textContent);
        debouncedUpdate(textContent);
      },
      onFocus: ({ editor }) => {
        const textContent = editor.getText();
        onFocus?.(textContent);
      },
      onBlur: ({ editor }) => {
        const textContent = editor.getText();
        if (debounceRef.current) {
          clearTimeout(debounceRef.current);
          debounceRef.current = null;
        }
        onDebouncedUpdate?.(textContent);
        onBlur?.(textContent);
      },
      editorProps: {
        attributes: {
          class: "focus:outline-none",
          "data-placeholder": placeholder,
        },
        handleKeyDown: (view, event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            return true;
          }
          return false;
        },
      },
    },
    []
  ); // Empty dependency array to prevent re-initialization

  return (
    <>
      <DialogTitle asChild>
        <div>
          <EditorContent
            editor={editor}
            className={`font-semibold leading-none tracking-tight cursor-text ${className}`}
          />
        </div>
      </DialogTitle>
    </>
  );
}
