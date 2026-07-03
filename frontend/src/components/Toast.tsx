import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

export type ToastType = 'success' | 'error' | 'pending' | 'info';

export interface ToastItem {
  id: number;
  type: ToastType;
  title: string;
  description: string;
}

interface ToastContextValue {
  toasts: ToastItem[];
  notifications: ToastItem[]; // history for the bell panel — session-only, never persisted to DB
  hasUnread: boolean;
  showToast: (type: ToastType, title: string, description: string) => void;
  markRead: () => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const ICONS: Record<ToastType, string> = {
  success: '\u2713',
  error: '\u2715',
  pending: '\u23F3',
  info: '\u2139',
};

let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [notifications, setNotifications] = useState<ToastItem[]>([]);
  const [hasUnread, setHasUnread] = useState(false);

  const showToast = useCallback((type: ToastType, title: string, description: string) => {
    const item: ToastItem = { id: nextId++, type, title, description };
    setToasts((prev) => [...prev, item]);
    setNotifications((prev) => [item, ...prev].slice(0, 8));
    setHasUnread(true);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== item.id));
    }, 4200);
  }, []);

  const markRead = useCallback(() => setHasUnread(false), []);

  return (
    <ToastContext.Provider value={{ toasts, notifications, hasUnread, showToast, markRead }}>
      {children}
      <div className="toast-stack">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.type}`}>
            <div className="toast-icon">{ICONS[t.type]}</div>
            <div>
              <div className="tt">{t.title}</div>
              <div className="td">{t.description}</div>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}