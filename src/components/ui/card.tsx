// card.tsx
import type { ReactNode } from 'react';

export function Card({ children, className, onClick, ...props }: { children: ReactNode; className?: string; onClick?: () => void }) {
  return (
    <div
      className={`shadow-md rounded-lg p-6 border hover:border-[#00d4ff] ${className}`}
      style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
      onClick={onClick}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardContent({ children }: { children: ReactNode }) {
  return <div className="text-center font-medium" style={{ color: 'var(--text-secondary)' }}>{children}</div>;
}