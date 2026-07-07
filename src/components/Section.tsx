import type { ReactNode } from 'react';

export function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="border-t border-black py-8">
      <h2 className="text-[11px] uppercase tracking-[0.08em] mb-4">{label}</h2>
      {children}
    </div>
  );
}
