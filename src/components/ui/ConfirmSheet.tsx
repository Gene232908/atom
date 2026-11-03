import { useState, type ReactNode } from 'react';
import { Sheet } from './Sheet';
import { Button } from './Button';

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  message: ReactNode;
  confirmText: string;
  danger?: boolean;
  /** Can return a promise. The button shows loading until it finishes. */
  onConfirm: () => void | Promise<void>;
}

export function ConfirmSheet({ open, onClose, title, message, confirmText, danger, onConfirm }: Props) {
  const [busy, setBusy] = useState(false);

  const handleConfirm = async () => {
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={busy ? () => undefined : onClose}
      title={title}
      zIndex="z-[70]"
      footer={
        <div className="grid grid-cols-2 gap-3 w-full">
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={handleConfirm} loading={busy}>
            {confirmText}
          </Button>
        </div>
      }
    >
      <div className="text-[15px] leading-relaxed text-muted pt-1 pb-2">{message}</div>
    </Sheet>
  );
}
