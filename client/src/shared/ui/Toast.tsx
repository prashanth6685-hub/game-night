import { createContext, useCallback, useContext, useRef, useState } from 'react';
import type { ReactNode } from 'react';

export type ToastKind = 'info' | 'success' | 'error';

interface ToastItem {
  id: number;
  msg: string;
  kind: ToastKind;
}

interface ToastContextValue {
  toast: (msg: string, kind?: ToastKind) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const DISMISS_MS = 3500;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const toast = useCallback((msg: string, kind: ToastKind = 'info') => {
    const id = nextId.current++;
    setItems((prev) => [...prev, { id, msg, kind }]);
    // Auto-dismiss after 3.5s.
    window.setTimeout(() => {
      setItems((prev) => prev.filter((t) => t.id !== id));
    }, DISMISS_MS);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="ui-toast-container" aria-live="polite" role="status">
        {items.map((t) => (
          <div key={t.id} className={`ui-toast ui-toast-${t.kind}`}>
            {t.msg}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): { toast: (msg: string, kind?: ToastKind) => void } {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}
