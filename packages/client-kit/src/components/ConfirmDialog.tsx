import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@rewindom/ui/alert-dialog";

import { useConfirm } from "../hooks/useConfirm.js";


export function ConfirmDialog() {
  const { isOpen, options, handleConfirm, handleCancel } = useConfirm();

  if (!options) return null;

  return (
    <AlertDialog open={isOpen} onOpenChange={handleCancel}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{options.title}</AlertDialogTitle>
          {options.description && (
            <AlertDialogDescription className="whitespace-pre-wrap">
              {options.description}
            </AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{options.cancelText || "取消"}</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            variant={options.destructive ? "destructive" : "default"}
          >
            {options.confirmText || "确认"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
