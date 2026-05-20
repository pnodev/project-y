// components/confirm-dialog.tsx
import React, { useState, useCallback } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "~/components/ui/alert-dialog";
import { buttonVariants } from "~/components/ui/button";
import { cn } from "~/lib/utils";

interface ConfirmDialogProps {
  children: React.ReactNode; // The element that triggers the dialog
  title: string;
  description: string;
  onConfirm: () => void;
  confirmText?: string;
  cancelText?: string;
  /** @default "destructive" — red confirm button for delete/remove flows */
  confirmVariant?: "default" | "destructive";
}

export function ConfirmDialog({
  children,
  title,
  description,
  onConfirm,
  confirmText = "Continue",
  cancelText = "Cancel",
  confirmVariant = "destructive",
}: ConfirmDialogProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleConfirm = useCallback(() => {
    onConfirm();
    setIsOpen(false); // Close the dialog after confirmation
  }, [onConfirm]);

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setIsOpen(false)}>
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction
            className={cn(buttonVariants({ variant: confirmVariant }))}
            onClick={handleConfirm}
          >
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
