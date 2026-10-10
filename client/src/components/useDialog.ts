import { useEffect, useRef, type RefObject } from 'react';

export function useDialog(open: boolean, initialFocus: RefObject<HTMLElement | null>) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (!open || !dialog.current) return;
    const element = dialog.current;
    const opener = document.activeElement as HTMLElement | null;
    element.showModal();
    initialFocus.current?.focus();
    return () => { element.close(); if (opener?.isConnected) opener.focus(); };
  }, [open, initialFocus]);
  return dialog;
}
