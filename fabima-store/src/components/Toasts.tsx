import React from 'react';
import { CheckCircle2, Info, XCircle } from 'lucide-react';
import { useStore } from '../context/StoreContext';

export const Toasts: React.FC = () => {
  const { toasts } = useStore();
  return (
    <div className="fixed bottom-24 sm:bottom-6 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 w-[calc(100%-2rem)] max-w-sm" aria-live="polite">
      {toasts.map(t => {
        const Icon = t.type === 'error' ? XCircle : t.type === 'info' ? Info : CheckCircle2;
        return (
          <div key={t.id} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-ink text-ivory shadow-2xl animate-fade-up text-sm">
            <Icon className={`w-5 h-5 shrink-0 ${t.type === 'error' ? 'text-red-400' : 'text-gold-light'}`} />
            <span>{t.message}</span>
          </div>
        );
      })}
    </div>
  );
};
