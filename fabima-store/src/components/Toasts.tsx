import React from 'react';
import { Check, Info, X } from 'lucide-react';
import { useStore } from '../context/StoreContext';

export const Toasts: React.FC = () => {
  const { toasts } = useStore();
  return (
    <div className="fixed bottom-24 left-4 right-4 sm:bottom-6 sm:left-6 sm:right-auto z-[100] flex flex-col gap-2 sm:w-[360px]" aria-live="polite">
      {toasts.map(t => {
        const Icon = t.type === 'error' ? X : t.type === 'info' ? Info : Check;
        return (
          <div key={t.id} className="flex items-center gap-4 pl-4 pr-5 py-4 bg-ink text-ivory shadow-luxe animate-fade-up text-[13px]">
            <span className={`w-7 h-7 rounded-full grid place-items-center shrink-0 ${t.type === 'error' ? 'bg-wine' : 'border border-gold-light/50'}`}>
              <Icon className="w-3.5 h-3.5 text-gold-light" />
            </span>
            <span className="leading-snug">{t.message}</span>
          </div>
        );
      })}
    </div>
  );
};
