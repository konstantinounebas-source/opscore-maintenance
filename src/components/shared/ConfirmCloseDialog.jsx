import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function ConfirmCloseDialog({ open, onConfirm, onCancel, mode = "close" }) {
  const isSave = mode === "save";
  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isSave ? "Save changes?" : "Discard changes?"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isSave
              ? "Are you sure you want to save these changes?"
              : "You have unsaved changes. Are you sure you want to close without saving?"}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>
            {isSave ? "Cancel" : "Keep Editing"}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={isSave ? "bg-indigo-600 hover:bg-indigo-700" : "bg-red-600 hover:bg-red-700"}
          >
            {isSave ? "Save" : "Discard"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}