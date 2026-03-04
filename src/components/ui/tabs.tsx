// tabs.tsx
// tabs.tsx
import React, { useState } from "react";
import type { ReactNode } from 'react';

export function Tabs({ defaultValue, children, className }: { defaultValue: string; children: ReactNode[]; className?: string }) {
  const [activeTab, setActiveTab] = useState(defaultValue);
  return (
<div className={`${className} p-4 rounded-lg border`} style={{ backgroundColor: 'var(--bg-content-alt)', borderColor: 'var(--border-color)' }}>
      <div className="flex space-x-4 border-b mb-4" style={{ borderColor: 'var(--border-color)' }}>
        {children.map(child => React.cloneElement(child as any, { activeTab, setActiveTab, key: (child as any).props.value }))}
      </div>
      {children.map(child => React.cloneElement(child as any, { activeTab }))}
    </div>
  );
}

export function TabsList({ children }: { children: ReactNode }) {
  return <div className="flex space-x-4">{children}</div>;
}

export function TabsTrigger({ value, children, activeTab, setActiveTab }: { value: string; children: ReactNode; activeTab?: string; setActiveTab?: (value: string) => void }) {
  return (
    <button
      onClick={() => setActiveTab?.(value)}
      className={`px-4 py-2 text-sm rounded transition-all ${activeTab === value ? 'border-b-2 border-[#00d4ff] text-[#00d4ff]' : 'tabs-trigger-inactive'}`}
    >
      {children}
    </button>
  );
}

export function TabsContent({ value, activeTab, children }: { value: string; activeTab?: string; children: ReactNode }) {
  return activeTab === value ? <div className="mt-4" style={{ color: 'var(--text-secondary)' }}>{children}</div> : null;
}
