import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
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
}

export function EditableDialogTitle({
  initialContent = "Untitled",
  onUpdate,
  onDebouncedUpdate,
  onFocus,
  onBlur,
  className = "",
  placeholder = "Click to edit title...",
  debounceMs = 500,
}: EditableDialogTitleProps) {
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const hasInitialized = useRef(false);

  const debouncedUpdate = useCallback(
    (content: string) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      debounceRef.current = setTimeout(() => {
        onDebouncedUpdate?.(content);
      }, debounceMs);
    },
    [onDebouncedUpdate, debounceMs],
  );

  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({
          heading: { levels: [2] },
        }),
      ],
      content: `<h2>${initialContent}</h2>`,
      autofocus: false,
      immediatelyRender: false,
      shouldRerenderOnTransaction: false,
      onUpdate: ({ editor }) => {
        const textContent = editor.getText();

        if (!hasInitialized.current) {
          hasInitialized.current = true;
          return;
        }

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
        if (!hasInitialized.current) return;
        onDebouncedUpdate?.(textContent);
        onBlur?.(textContent);
      },
      editorProps: {
        attributes: {
          class: "focus:outline-none",
          "data-placeholder": placeholder,
        },
        handleKeyDown: (_view, event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            return true;
          }
          return false;
        },
      },
    },
    [],
  );

  return (
    <DialogTitle asChild>
      <div>
        <EditorContent
          editor={editor}
          className={`font-bold text-2xl leading-none tracking-tight cursor-text ${className}`}
        />
      </div>
    </DialogTitle>
  );
}
