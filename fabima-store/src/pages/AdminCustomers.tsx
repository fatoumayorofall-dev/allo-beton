import React, { useEffect, useMemo, useState } from 'react';
import { Download, MessageCircle, Search, Users } from 'lucide-react';
import { buildWhatsAppLink } from '../config/site';
import { fetchCustomers, type CustomerRow } from '../services/api';
import { formatPrice } from '../utils/format';

const adminPin = () => { try { return sessionStorage.getItem('fabima_admin_pin') ?? ''; } catch { return ''; } };
const day = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
const local = (phone: string) => phone.replace(/^\+221/, '').replace(/(\d{2})(\d{3})(\d{2})(\d{2})/, '$1 $2 $3 $4');

function exportCsv(rows: CustomerRow[]) {
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const lines = [['Prénom', 'Nom', 'Téléphone', 'Quartier', 'Adresse', 'Inscrite le', 'Commandes', 'Total dépensé'],
    ...rows.map(c => [c.firstName, c.lastName, c.phone, c.zone, c.address, day(c.createdAt), c.orders, c.spent])];
  const blob = new Blob([`﻿${lines.map(l => l.map(esc).join(';')).join('\r\n')}`], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `clientes-fabima-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
}

/** Onglet « Clientes » : comptes créés avec un numéro de téléphone. */
export const CustomersTab: React.FC = () => {
  const [rows, setRows] = useState<CustomerRow[] | null | undefined>(undefined);
  const [q, setQ] = useState('');
  useEffect(() => { fetchCustomers(adminPin()).then(setRows); }, []);

  const list = useMemo(() => (rows ?? []).filter(c => `${c.firstName} ${c.lastName} ${c.phone} ${c.zone}`.toLowerCase().includes(q.toLowerCase())), [rows, q]);
  const thisMonth = (rows ?? []).filter(c => c.createdAt.slice(0, 7) === new Date().toISOString().slice(0, 7)).length;

  if (rows === undefined) return <p className="text-sm text-ink/50">Chargement…</p>;
  if (rows === null) {
    return <p className="bg-white border border-ink/[0.06] rounded-[2rem] p-8 text-sm text-ink/60">Les comptes clientes sont gardés par le serveur : démarrez-le (npm run server) avec le même code PIN (ADMIN_PIN) pour voir la liste.</p>;
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white border border-ink/[0.06] rounded-[2rem] p-5"><Users className="w-5 h-5 text-gold-dark" /><p className="text-xs text-ink/50 mt-3">Clientes inscrites</p><p className="font-display text-3xl">{rows.length}</p></div>
        <div className="bg-white border border-ink/[0.06] rounded-[2rem] p-5"><p className="text-xl">🌱</p><p className="text-xs text-ink/50 mt-2">Nouvelles ce mois-ci</p><p className="font-display text-3xl">{thisMonth}</p></div>
        <div className="bg-white border border-ink/[0.06] rounded-[2rem] p-5 col-span-2 lg:col-span-1"><p className="text-xl">🛍️</p><p className="text-xs text-ink/50 mt-2">Ont déjà commandé</p><p className="font-display text-3xl">{rows.filter(c => c.orders > 0).length}</p></div>
      </div>
      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-[200px] flex items-center gap-2 px-4 rounded-full bg-white">
          <Search className="w-4 h-4 text-ink/40" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Nom, numéro ou quartier" aria-label="Chercher une cliente" className="flex-1 py-3 outline-none bg-transparent text-sm" />
        </div>
        <button onClick={() => exportCsv(list)} disabled={!list.length} className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-gold text-white text-sm font-semibold disabled:opacity-40"><Download className="w-4 h-4" /> Exporter (Excel)</button>
      </div>
      {list.length === 0 ? (
        <p className="bg-white border border-ink/[0.06] rounded-[2rem] p-10 text-center text-ink/50">Aucune cliente inscrite pour l'instant. Elles s'inscrivent depuis « Mon compte » avec leur numéro.</p>
      ) : (
        <div className="bg-white border border-ink/[0.06] rounded-[2rem] overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead className="text-left text-ink/50 border-b border-ink/10">
              <tr><th className="p-4 font-medium">Cliente</th><th className="p-4 font-medium">Quartier</th><th className="p-4 font-medium">Inscrite le</th><th className="p-4 font-medium">Commandes</th><th className="p-4 font-medium text-right">Total</th><th className="p-4" /></tr>
            </thead>
            <tbody>
              {list.map(c => (
                <tr key={c.phone} className="border-b border-ink/5">
                  <td className="p-4"><strong>{[c.firstName, c.lastName].filter(Boolean).join(' ') || 'Sans prénom'}</strong><br /><span className="text-xs text-ink/50">{local(c.phone)}</span></td>
                  <td className="p-4">{c.zone || '—'}</td>
                  <td className="p-4">{day(c.createdAt)}</td>
                  <td className="p-4">{c.orders}</td>
                  <td className="p-4 text-right font-semibold">{formatPrice(c.spent)}</td>
                  <td className="p-4 text-right">
                    <a href={buildWhatsAppLink(`Bonjour ${c.firstName || ''} 🌸 C'est Fabima Store.`, c.phone.replace('+', ''))} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#1f8f4e] text-white text-xs"><MessageCircle className="w-3.5 h-3.5" /> WhatsApp</a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
