import { useEffect, useRef } from 'react';
import type { ReactNode, MouseEvent } from 'react';
import { useI18n } from '../../i18n/index.ts';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const { t } = useI18n();

  // Escape closes; autofocus the panel when it opens.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    panelRef.current?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const onBackdropClick = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div className="ui-modal-overlay" onClick={onBackdropClick}>
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="ui-modal-panel"
      >
        <button
          type="button"
          className="ui-modal-close"
          onClick={onClose}
          aria-label={t('common.close')}
        >
          ✕
        </button>
        {title ? <h2 className="ui-modal-title">{title}</h2> : null}
        {children}
      </div>
    </div>
  );
}
