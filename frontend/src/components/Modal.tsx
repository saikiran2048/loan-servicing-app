import type { ReactNode } from 'react';

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export default function Modal({ open, onClose, title, subtitle, children }: Props) {
  if (!open) return null;

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close">
          &times;
        </button>
        <h3>{title}</h3>
        {subtitle && <span className="sub">{subtitle}</span>}
        {children}
      </div>
    </div>
  );
}