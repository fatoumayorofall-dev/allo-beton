import React from 'react';
import { MessageCircle } from 'lucide-react';
import { buildWhatsAppLink } from '../config/site';

export const WhatsAppButton: React.FC = () => (
  <a href={buildWhatsAppLink('Bonjour Fabima Store 👋, j\'ai une question.')} target="_blank" rel="noopener noreferrer"
    aria-label="Nous écrire sur WhatsApp"
    className="fixed bottom-5 right-5 z-40 w-14 h-14 rounded-full bg-[#25D366] text-white grid place-items-center shadow-xl hover:scale-110 transition-transform">
    <MessageCircle className="w-7 h-7" />
  </a>
);
