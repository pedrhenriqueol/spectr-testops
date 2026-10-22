import React, { useEffect, useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { isAxiosError } from 'axios';

interface ModalShellProps {
  titleId: string;
  busy: boolean;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}

const focusableSelector = 'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';

export function getSubmitError(error: unknown, fallback: string): string {
  if (isAxiosError(error)) {
    const data = error.response?.data;
    if (typeof data?.message === 'string') return data.message;
    if (typeof data?.error === 'string') return data.error;
  }
  return error instanceof Error ? error.message : fallback;
}

export function ModalShell({ titleId, busy, onClose, children, wide = false }: ModalShellProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  const busyRef = useRef(busy);
  const reduceMotion = useReducedMotion();
  closeRef.current = onClose;
  busyRef.current = busy;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const getFocusable = () => Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector))
      .filter(element => !element.matches(':disabled') && element.getClientRects().length > 0);
    const focusFirst = () => {
      const preferred = dialog.querySelector<HTMLElement>('[data-autofocus]');
      const target = preferred && !preferred.matches(':disabled') ? preferred : getFocusable()[0] || dialog;
      target.focus({ preventScroll: true });
    };
    focusFirst();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        if (!busyRef.current) closeRef.current();
      }
      if (event.key !== 'Tab') return;
      const elements = getFocusable();
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (!first) {
        event.preventDefault();
        dialog.focus();
      } else if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    const handleFocus = (event: FocusEvent) => {
      if (event.target instanceof Node && !dialog.contains(event.target)) focusFirst();
    };
    document.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('focusin', handleFocus);
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('focusin', handleFocus);
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: reduceMotion ? 0 : 0.15 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={event => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <motion.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-busy={busy}
        tabIndex={-1}
        initial={reduceMotion ? false : { y: 8, scale: 0.98 }}
        animate={{ y: 0, scale: 1 }}
        transition={{ duration: reduceMotion ? 0 : 0.15, ease: 'easeOut' }}
        className={`bg-pm-light-surface dark:bg-pm-dark-surface border border-pm-light-border dark:border-pm-dark-border w-full ${wide ? 'max-w-lg' : 'max-w-md'} max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-lg p-5 shadow-xl relative font-sans text-xs`}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}
