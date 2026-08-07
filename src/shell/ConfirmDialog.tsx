import { Button, Dialog } from 'lingo-ds';

/**
 * Asks before something irreversible.
 *
 * Replaces window.confirm, which is not a dialog the app controls and in some
 * environments is not a dialog at all: a browser is free to decline to show one
 * and answer `false` on its behalf. Every destructive action in the app was
 * guarded by `if (!window.confirm(...)) return`, so where that happens the guard
 * reads as a decline and the action silently never runs — the worst shape of
 * failure, because nothing is broken enough to notice.
 */
export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  /** What will happen, in the terms of the thing being acted on. */
  description: string;
  /** The verb, not "OK" — the button should say what the button does. */
  confirmLabel: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open, title, description, confirmLabel, destructive = true, onConfirm, onCancel,
}: ConfirmDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onCancel}
      title={title}
      description={description}
      width={420}
      footer={
        <>
          <Button variant="ghost" onClick={onCancel}>Cancel</Button>
          <Button variant={destructive ? 'danger' : 'primary'} sound={false} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {null}
    </Dialog>
  );
}
