// card.tsx
import type { ReactNode } from 'react';

export function Card({ children, className, onClick, ...props }: { children: ReactNode; className?: string; onClick?: () => void }) {
  return (
    <div
      className={`bg-[#161b22] shadow-md rounded-lg p-6 border border-[#30363d] hover:border-[#00d4ff] ${className}`}
      onClick={onClick}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardContent({ children }: { children: ReactNode }) {
  return <div className="text-[#c9d1d9] text-center font-medium">{children}</div>;
}